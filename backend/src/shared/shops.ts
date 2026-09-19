import catalogData from "../../shops/catalog.json" with { type: "json" };
import type { Shop } from "./types.js";

const catalogShops = catalogData as Shop[];

export function loadCatalogShops(): Shop[] {
  return catalogShops;
}

export function getCatalogShop(shopId: string): Shop | undefined {
  return catalogShops.find((shop) => shop.shopId === shopId);
}

export function resolveCatalogShops(shopIds: string[]): {
  shops: Shop[];
  unknown: string[];
} {
  const uniqueIds = [...new Set(shopIds)];
  const shops: Shop[] = [];
  const unknown: string[] = [];

  for (const shopId of uniqueIds) {
    const shop = getCatalogShop(shopId);
    if (shop) {
      shops.push(shop);
    } else {
      unknown.push(shopId);
    }
  }

  return { shops, unknown };
}

export function toPublicShop(shop: Shop): Shop {
  return {
    shopId: shop.shopId,
    name: shop.name,
    website: shop.website,
    pagesToMonitor: shop.pagesToMonitor,
    monitorFrequencyHours: shop.monitorFrequencyHours,
    crawlStrategy: shop.crawlStrategy,
    followLinkPattern: shop.followLinkPattern,
    followListingPattern: shop.followListingPattern,
  };
}

export function buildPageUrl(website: string, pagePath: string): string {
  const base = website.replace(/\/$/, "");
  const path = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  return `${base}${path}`;
}
