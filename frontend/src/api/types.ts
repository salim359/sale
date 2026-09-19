export type CrawlStrategy = "http" | "https" | "browser";

export interface Shop {
  shopId: string;
  name: string;
  website: string;
  pagesToMonitor: string[];
  monitorFrequencyHours: number;
  crawlStrategy: CrawlStrategy;
  followLinkPattern?: string;
  selected?: boolean;
}

export interface Sale {
  shopId: string;
  shopName: string;
  title: string;
  summary: string;
  discountPercentage?: number;
  url: string;
  confidence: number;
  detectedAt: string;
}

export type NotificationType = "sale_detected" | "discount_increased";

export interface Notification {
  notificationId: string;
  type: NotificationType;
  shopId: string;
  shopName: string;
  title: string;
  summary: string;
  url: string;
  discountPercentage?: number;
  read: boolean;
  createdAt: string;
}

export interface CatalogResponse {
  count: number;
  shops: Shop[];
}

export interface ShopsResponse {
  count: number;
  shops: Shop[];
}

export interface SalesResponse {
  date: string;
  count: number;
  sales: Sale[];
}

export interface NotificationsResponse {
  count: number;
  unreadCount: number;
  notifications: Notification[];
}

export interface NotificationReadResponse {
  notification: Notification;
}

export interface ApiErrorBody {
  message?: string;
  error?: string;
  unknown?: string[];
}
