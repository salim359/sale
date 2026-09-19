import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import {
  listNotifications,
  markNotificationRead,
  toPublicNotification,
} from "../shared/dynamo/notifications.js";
import { emptyResponse, jsonResponse } from "./http.js";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return emptyResponse(204);
    }

    const resource = event.resource;
    const method = event.httpMethod;

    if (method === "GET" && resource === "/notifications") {
      return await list(event.queryStringParameters?.unread);
    }

    if (
      method === "POST" &&
      resource === "/notifications/{notificationId}/read"
    ) {
      return await markRead(event.pathParameters?.notificationId);
    }

    return jsonResponse(404, { message: "Not found" });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, {
      message: "Failed to process notifications request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function list(
  unread: string | undefined,
): Promise<APIGatewayProxyResult> {
  const unreadOnly = unread === "true" || unread === "1";
  const notifications = await listNotifications({ unreadOnly });

  return jsonResponse(200, {
    count: notifications.length,
    unreadCount: notifications.filter((item) => !item.read).length,
    notifications: notifications.map(toPublicNotification),
  });
}

async function markRead(
  notificationId: string | undefined,
): Promise<APIGatewayProxyResult> {
  if (!notificationId) {
    return jsonResponse(400, { message: "notificationId is required" });
  }

  const notification = await markNotificationRead(notificationId);
  if (!notification) {
    return jsonResponse(404, {
      message: `Notification ${notificationId} was not found`,
    });
  }

  return jsonResponse(200, { notification: toPublicNotification(notification) });
}
