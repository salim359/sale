import type {
  ApiErrorBody,
  CatalogResponse,
  NotificationReadResponse,
  NotificationsResponse,
  Sale,
  SalesResponse,
  Shop,
  ShopsResponse,
} from "./types";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://4e7nmpufi0.execute-api.us-east-1.amazonaws.com/Prod";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T | ApiErrorBody) : null;

  if (!response.ok) {
    const body = data as ApiErrorBody | null;
    throw new ApiError(
      body?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return data as T;
}

export function getCatalog(): Promise<CatalogResponse> {
  return request("/shops/catalog");
}

export function getSelectedShops(): Promise<ShopsResponse> {
  return request("/shops");
}

export function selectShops(shopIds: string[]): Promise<ShopsResponse> {
  return request("/shops", {
    method: "POST",
    body: JSON.stringify({ shopIds }),
  });
}

export function removeShop(
  shopId: string,
): Promise<{ shopId: string; removed: boolean }> {
  return request(`/shops/${encodeURIComponent(shopId)}`, {
    method: "DELETE",
  });
}

export function getSales(date?: string): Promise<SalesResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request(`/sales${query}`);
}

export function getNotifications(unreadOnly = false): Promise<NotificationsResponse> {
  const query = unreadOnly ? "?unread=true" : "";
  return request(`/notifications${query}`);
}

export function markNotificationRead(
  notificationId: string,
): Promise<NotificationReadResponse> {
  return request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
  });
}

export function saleKey(sale: Sale): string {
  return [sale.shopId, sale.detectedAt, sale.title].join("::");
}

export function hostnameOf(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export type { Shop, Sale };
