import { randomUUID } from "node:crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { NotificationRecord, NotificationType } from "../types.js";
import {
  docClient,
  NOTIFICATION_METADATA_SK,
  notificationPk,
  NOTIFICATIONS_TABLE_NAME,
  notificationsIndexPk,
  notificationsIndexSk,
} from "./client.js";

const NOTIFICATIONS_INDEX = "NotificationsByTimeIndex";
const DEFAULT_LIMIT = 50;

export function buildNotificationRecord(params: {
  type: NotificationType;
  shopId: string;
  shopName: string;
  title: string;
  summary: string;
  url: string;
  discountPercentage?: number;
  notificationId?: string;
  createdAt?: string;
}): NotificationRecord {
  const notificationId = params.notificationId ?? randomUUID();
  const createdAt = params.createdAt ?? new Date().toISOString();

  return {
    pk: notificationPk(notificationId),
    sk: NOTIFICATION_METADATA_SK,
    gsi1pk: notificationsIndexPk(),
    gsi1sk: notificationsIndexSk(createdAt, notificationId),
    notificationId,
    type: params.type,
    shopId: params.shopId,
    shopName: params.shopName,
    title: params.title,
    summary: params.summary,
    url: params.url,
    discountPercentage: params.discountPercentage,
    read: false,
    createdAt,
  };
}

export async function saveNotification(
  notification: NotificationRecord,
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: NOTIFICATIONS_TABLE_NAME,
      Item: notification,
    }),
  );
}

export async function listNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: NOTIFICATIONS_TABLE_NAME,
      IndexName: NOTIFICATIONS_INDEX,
      KeyConditionExpression: "gsi1pk = :gsi1pk",
      FilterExpression: options?.unreadOnly ? "#read = :unread" : undefined,
      ExpressionAttributeNames: options?.unreadOnly
        ? { "#read": "read" }
        : undefined,
      ExpressionAttributeValues: {
        ":gsi1pk": notificationsIndexPk(),
        ...(options?.unreadOnly ? { ":unread": false } : {}),
      },
      ScanIndexForward: false,
      Limit: options?.limit ?? DEFAULT_LIMIT,
    }),
  );

  return (result.Items as NotificationRecord[]) ?? [];
}

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationRecord | null> {
  const existing = await docClient.send(
    new GetCommand({
      TableName: NOTIFICATIONS_TABLE_NAME,
      Key: {
        pk: notificationPk(notificationId),
        sk: NOTIFICATION_METADATA_SK,
      },
    }),
  );

  if (!existing.Item) return null;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: NOTIFICATIONS_TABLE_NAME,
      Key: {
        pk: notificationPk(notificationId),
        sk: NOTIFICATION_METADATA_SK,
      },
      UpdateExpression: "SET #read = :read",
      ExpressionAttributeNames: { "#read": "read" },
      ExpressionAttributeValues: { ":read": true },
      ReturnValues: "ALL_NEW",
    }),
  );

  return (result.Attributes as NotificationRecord) ?? null;
}

export function toPublicNotification(notification: NotificationRecord) {
  return {
    notificationId: notification.notificationId,
    type: notification.type,
    shopId: notification.shopId,
    shopName: notification.shopName,
    title: notification.title,
    summary: notification.summary,
    url: notification.url,
    discountPercentage: notification.discountPercentage,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}
