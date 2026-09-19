import type { Sale, Shop } from "../api/types";

export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDetectedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function hostnameOf(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export function saleKey(sale: Sale): string {
  return `${sale.shopId}::${sale.detectedAt}::${sale.title}`;
}

export function shopById(shops: Shop[], shopId: string): Shop | undefined {
  return shops.find((shop) => shop.shopId === shopId);
}
