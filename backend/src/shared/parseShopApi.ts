import type { ExtractedContent, SaleItem, ShopApiMapping } from "./types.js";

export interface ParsedShopApi {
  extracted: ExtractedContent;
  sales: SaleItem[];
}

export function parseShopApi(
  payload: unknown,
  mapping: ShopApiMapping,
  pageUrl: string,
): ParsedShopApi {
  if (!mapping.title || !mapping.price) {
    throw new Error("API mapping requires title and price fields");
  }

  const items = getItems(payload, mapping.itemsPath);
  const sales: SaleItem[] = [];
  const headings: string[] = [];
  const prices: string[] = [];
  const links: string[] = [];
  const itemTexts: string[] = [];

  for (const item of items) {
    if (item == null || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const title = stringifyField(getByPath(record, mapping.title));
    const price = parsePrice(getByPath(record, mapping.price));
    if (!title || price == null) continue;

    const originalPrice = mapping.originalPrice
      ? parsePrice(getByPath(record, mapping.originalPrice))
      : undefined;
    const mappedDiscount = mapping.discountPercentage
      ? parsePrice(getByPath(record, mapping.discountPercentage))
      : undefined;
    const productUrl = mapping.url
      ? resolveUrl(stringifyField(getByPath(record, mapping.url)), pageUrl)
      : record.id != null
        ? resolveUrl(`/products/${String(record.id)}`, pageUrl)
        : pageUrl;
    const summary = mapping.summary
      ? stringifyField(getByPath(record, mapping.summary))
      : undefined;

    headings.push(title);
    prices.push(formatPrice(price));
    if (productUrl) links.push(productUrl);

    const discountPercentage =
      originalPrice != null && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : mappedDiscount != null && mappedDiscount > 0
          ? Math.round(mappedDiscount)
          : undefined;

    itemTexts.push(
      [title, formatPrice(price), originalPrice != null ? formatPrice(originalPrice) : ""]
        .filter(Boolean)
        .join(" "),
    );

    if (discountPercentage && discountPercentage > 0) {
      sales.push({
        title,
        summary:
          summary ||
          (originalPrice != null
            ? `${formatPrice(price)} (was ${formatPrice(originalPrice)})`
            : `${discountPercentage}% off`),
        saleType: "percentage_discount",
        discountPercentage,
        confidence: 1,
        url: productUrl,
      });
    }
  }

  return {
    extracted: {
      title: "API catalog",
      headings: unique(headings).slice(0, 40),
      promoText: [],
      prices: unique(prices).slice(0, 40),
      links: unique(links).slice(0, 40),
      items: unique(itemTexts).slice(0, 40),
      rawTextSample: itemTexts.join(" | ").slice(0, 6000),
    },
    sales,
  };
}

function getItems(payload: unknown, itemsPath?: string): unknown[] {
  const value = itemsPath ? getByPath(payload, itemsPath) : payload;
  if (Array.isArray(value)) return value;
  throw new Error(
    itemsPath
      ? `API itemsPath "${itemsPath}" did not resolve to an array`
      : "API response was not an array",
  );
}

export function getByPath(value: unknown, path: string): unknown {
  if (!path) return value;

  let current = value;
  for (const key of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringifyField(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

function resolveUrl(value: string, pageUrl: string): string {
  if (!value) return pageUrl;
  try {
    return new URL(value, pageUrl).href;
  } catch {
    return pageUrl;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
