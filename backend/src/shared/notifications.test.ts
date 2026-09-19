import { describe, expect, it } from "vitest";
import {
  notificationPk,
  notificationsIndexPk,
  notificationsIndexSk,
} from "./dynamo/client.js";
import {
  buildNotificationRecord,
  toPublicNotification,
} from "./dynamo/notifications.js";

describe("notifications", () => {
  it("builds a notification row for the notifications table", () => {
    const notification = buildNotificationRecord({
      notificationId: "n-1",
      createdAt: "2026-09-18T12:00:00.000Z",
      type: "sale_detected",
      shopId: "catalog108",
      shopName: "Catalog108 Deals",
      title: "Black Wooden Cable",
      summary: "20% off",
      url: "https://practice.scrapingcentral.com/products/334-black-wooden-cable",
      discountPercentage: 20,
    });

    expect(notification.pk).toBe(notificationPk("n-1"));
    expect(notification.sk).toBe("METADATA");
    expect(notification.gsi1pk).toBe(notificationsIndexPk());
    expect(notification.gsi1sk).toBe(
      notificationsIndexSk("2026-09-18T12:00:00.000Z", "n-1"),
    );
    expect(notification.read).toBe(false);
    expect(toPublicNotification(notification)).toEqual({
      notificationId: "n-1",
      type: "sale_detected",
      shopId: "catalog108",
      shopName: "Catalog108 Deals",
      title: "Black Wooden Cable",
      summary: "20% off",
      url: "https://practice.scrapingcentral.com/products/334-black-wooden-cable",
      discountPercentage: 20,
      read: false,
      createdAt: "2026-09-18T12:00:00.000Z",
    });
  });
});
