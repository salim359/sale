import { createHash } from "node:crypto";
import type { ExtractedContent } from "./types.js";

export function hashContent(content: ExtractedContent): string {
  const normalized = JSON.stringify(normalizeForHash(content));
  return createHash("sha256").update(normalized).digest("hex");
}

function normalizeForHash(content: ExtractedContent): ExtractedContent {
  return {
    title: content.title.trim().toLowerCase(),
    headings: content.headings.map((h) => h.trim().toLowerCase()).sort(),
    promoText: content.promoText.map((p) => p.trim().toLowerCase()).sort(),
    prices: content.prices.map((p) => p.trim()).sort(),
    links: content.links.map((l) => l.trim()).sort(),
    items: content.items.map((item) => item.trim().toLowerCase()).sort(),
    rawTextSample: content.rawTextSample.trim().toLowerCase().slice(0, 1000),
  };
}

export function computeSaleFingerprint(params: {
  shopId: string;
  title: string;
  discountValue: string;
  url: string;
}): string {
  const normalized = [
    params.shopId,
    normalizeTitle(params.title),
    params.discountValue,
    canonicalizeUrl(params.url),
  ].join("|");

  return createHash("sha256").update(normalized).digest("hex");
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return url.toLowerCase();
  }
}

export function discountValueForFingerprint(
  discountPercentage?: number,
): string {
  return discountPercentage != null ? String(discountPercentage) : "none";
}
