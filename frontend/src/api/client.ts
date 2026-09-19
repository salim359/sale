import { readTokens, writeTokens } from "../lib/storage";
import type {
  ApiErrorBody,
  AuthTokens,
  AuthUser,
  CatalogResponse,
  NotificationReadResponse,
  NotificationsResponse,
  Sale,
  SalesResponse,
  Shop,
  ShopsResponse,
  SignupResponse,
} from "./types";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isPublicAuthPath(path: string): boolean {
  return (
    path.startsWith("/auth/") &&
    path !== "/auth/me"
  );
}

async function request<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const tokens = readTokens();
  if (tokens?.idToken && !isPublicAuthPath(path)) {
    headers.Authorization = `Bearer ${tokens.idToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && !retried && !isPublicAuthPath(path)) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, init, true);
  }

  const text = await response.text();
  let data: T | ApiErrorBody | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T | ApiErrorBody;
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const body = data as ApiErrorBody | null;
    throw new ApiError(
      body?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return data as T;
}

async function refreshSession(): Promise<boolean> {
  const tokens = readTokens();
  if (!tokens?.refreshToken || !tokens.email) {
    writeTokens(null);
    return false;
  }

  try {
    const next = await request<AuthTokens>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({
          email: tokens.email,
          refreshToken: tokens.refreshToken,
        }),
      },
      true,
    );
    writeTokens({
      idToken: next.idToken,
      accessToken: next.accessToken,
      refreshToken: next.refreshToken || tokens.refreshToken,
      email: tokens.email,
    });
    return true;
  } catch {
    writeTokens(null);
    return false;
  }
}

export function signupAccount(body: {
  name: string;
  email: string;
  password: string;
}): Promise<SignupResponse> {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function confirmAccount(email: string, code: string): Promise<{ confirmed: boolean; email: string }> {
  return request("/auth/confirm", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function resendConfirmation(email: string): Promise<{ sent: boolean; email: string }> {
  return request("/auth/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function loginAccount(
  email: string,
  password: string,
): Promise<AuthUser> {
  const tokens = await request<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  writeTokens({
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    email,
  });
  return getMe();
}

export function getMe(): Promise<AuthUser> {
  return request("/auth/me");
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
