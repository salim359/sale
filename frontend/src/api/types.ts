export type CrawlStrategy = "http" | "https" | "api" | "browser";

export interface Shop {
  shopId: string;
  name: string;
  website: string;
  pagesToMonitor: string[];
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

export interface SignupResponse {
  userSub: string;
  confirmationRequired: boolean;
  message?: string;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthUser {
  sub: string;
  email: string | null;
  name: string | null;
}
