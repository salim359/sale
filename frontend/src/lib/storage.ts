import type { Sale } from "../api/types";

export interface Profile {
  name: string;
  email: string;
}

export interface SavedItem {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  summary: string;
  image?: string;
  url: string;
  discountPercentage?: number;
  price?: number;
  was?: number;
  detectedAt: string;
}

const KEYS = {
  onboarded: "sale-scout-onboarded",
  profile: "sale-scout-profile",
  saved: "sale-scout-saved",
  alerts: "sale-scout-alerts",
  tokens: "sale-scout-tokens",
} as const;

export interface StoredTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  email: string;
}

export function readOnboarded(): boolean {
  return localStorage.getItem(KEYS.onboarded) === "1";
}

export function writeOnboarded(value: boolean): void {
  localStorage.setItem(KEYS.onboarded, value ? "1" : "0");
}

export function readProfile(): Profile | null {
  const raw = localStorage.getItem(KEYS.profile);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function writeProfile(profile: Profile | null): void {
  if (!profile) {
    localStorage.removeItem(KEYS.profile);
    return;
  }
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export function readSaved(): SavedItem[] {
  const raw = localStorage.getItem(KEYS.saved);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedItem[];
  } catch {
    return [];
  }
}

export function writeSaved(items: SavedItem[]): void {
  localStorage.setItem(KEYS.saved, JSON.stringify(items));
}

export function readAlertsEnabled(): boolean {
  return localStorage.getItem(KEYS.alerts) !== "0";
}

export function writeAlertsEnabled(value: boolean): void {
  localStorage.setItem(KEYS.alerts, value ? "1" : "0");
}

export function readTokens(): StoredTokens | null {
  const raw = localStorage.getItem(KEYS.tokens);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed.idToken || !parsed.refreshToken || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: StoredTokens | null): void {
  if (!tokens) {
    localStorage.removeItem(KEYS.tokens);
    return;
  }
  localStorage.setItem(KEYS.tokens, JSON.stringify(tokens));
}

export function saleToSaved(sale: Sale, image?: string): SavedItem {
  return {
    id: `${sale.shopId}::${sale.detectedAt}::${sale.title}`,
    shopId: sale.shopId,
    shopName: sale.shopName,
    title: sale.title,
    summary: sale.summary,
    image,
    url: sale.url,
    discountPercentage: sale.discountPercentage,
    detectedAt: sale.detectedAt,
  };
}
