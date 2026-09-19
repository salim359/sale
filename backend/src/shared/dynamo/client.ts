import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = process.env.TABLE_NAME ?? "SaleScoutTable";

export function shopPk(shopId: string): string {
  return `SHOP#${shopId}`;
}

export function pageSk(pagePath: string): string {
  return `PAGE#${pagePath}`;
}

export function saleSk(date: string, fingerprint: string): string {
  return `SALE#${date}#${fingerprint.slice(0, 16)}`;
}

export function shopsIndexPk(): string {
  return "SHOPS";
}

export function shopsIndexSk(shopId: string): string {
  return `SHOP#${shopId}`;
}

export function salesByDatePk(date: string): string {
  return `SALES#${date}`;
}

export function salesByDateSk(
  shopId: string,
  detectedAt: string,
  fingerprint: string,
): string {
  return `SHOP#${shopId}#${detectedAt}#${fingerprint.slice(0, 12)}`;
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const NOTIFICATIONS_TABLE_NAME =
  process.env.NOTIFICATIONS_TABLE_NAME ?? "SaleScoutNotifications";

export const NOTIFICATION_METADATA_SK = "METADATA";

export function notificationPk(notificationId: string): string {
  return `NOTIF#${notificationId}`;
}

export function notificationsIndexPk(): string {
  return "NOTIFICATIONS";
}

export function notificationsIndexSk(
  createdAt: string,
  notificationId: string,
): string {
  return `${createdAt}#${notificationId}`;
}
