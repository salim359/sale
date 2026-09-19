import type { Shop } from "../api/types";
import { fetchShopHtml } from "./shopFetch";

export interface ProductReview {
  author: string;
  rating?: number;
  title?: string;
  body: string;
  date?: string;
}

export interface ProductDetails {
  url: string;
  description?: string;
  bullets: string[];
  specs: { label: string; value: string }[];
  categories: string[];
  reviews: ProductReview[];
  averageRating?: number;
  reviewCount?: number;
  images: string[];
  price?: number;
  was?: number;
}

const SKIP_IMAGE =
  /logo|favicon|icon\.svg|og-image|apple-touch|placeholder|sprite/i;

export async function loadProductDetails(
  title: string,
  pageUrl: string,
  shop?: Shop,
): Promise<ProductDetails | null> {
  const productUrl = await resolveProductUrl(title, pageUrl, shop);
  if (!productUrl) return null;

  const html = await fetchShopHtml(productUrl);
  const details = parseProductHtml(html, productUrl);
  if (!hasUsefulDetails(details)) return { ...details, url: productUrl };
  return { ...details, url: productUrl };
}

function hasUsefulDetails(details: ProductDetails): boolean {
  return Boolean(
    details.description ||
      details.bullets.length ||
      details.reviews.length ||
      details.images.length ||
      details.categories.length,
  );
}

async function resolveProductUrl(
  title: string,
  pageUrl: string,
  shop?: Shop,
): Promise<string | null> {
  if (isLikelyProductPath(pageUrl)) {
    const html = await fetchShopHtml(pageUrl);
    const nested = productLinkFromDealPage(html, pageUrl);
    return nested ?? pageUrl;
  }

  const origins = [pageUrl, shop?.website].filter(Boolean) as string[];
  for (const originUrl of origins) {
    try {
      const html = await fetchShopHtml(originUrl);
      const match = findTitleLink(html, originUrl, title);
      if (!match) continue;
      if (isLikelyProductPath(match) && !/\/deals\/\d+$/.test(new URL(match).pathname)) {
        return match;
      }
      const nestedHtml = await fetchShopHtml(match);
      return productLinkFromDealPage(nestedHtml, match) ?? match;
    } catch {
      // try next origin
    }
  }

  return null;
}

function isLikelyProductPath(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return /\/products\/.+/.test(path) || /\/product-/.test(path) || /\/deals\/\d+$/.test(path);
  } catch {
    return false;
  }
}

function productLinkFromDealPage(html: string, pageUrl: string): string | null {
  const doc = parseHtml(html);
  const link = [...doc.querySelectorAll("a[href]")].find((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    const text = (anchor.textContent ?? "").toLowerCase();
    return /\/products\//.test(href) || text.includes("view product");
  });
  return link ? absolutize(link.getAttribute("href") ?? "", pageUrl) : null;
}

function findTitleLink(html: string, pageUrl: string, title: string): string | null {
  const doc = parseHtml(html);
  const needle = normalize(title);
  if (!needle) return null;

  for (const item of doc.querySelectorAll("[data-deal-id], .deal-item")) {
    const heading = item.querySelector("h1, h2, h3, a");
    if (normalize(heading?.textContent ?? "") !== needle) continue;
    const href =
      item.querySelector("a[href]")?.getAttribute("href") ??
      `/deals/${item.getAttribute("data-deal-id") ?? ""}`;
    const absolute = absolutize(href, pageUrl);
    if (absolute) return absolute;
  }

  for (const anchor of doc.querySelectorAll("a[href]")) {
    const text = normalize(anchor.textContent ?? "");
    const href = anchor.getAttribute("href") ?? "";
    if (text === needle || (text.includes(needle) && isLikelyProductPath(absolutize(href, pageUrl) ?? href))) {
      const absolute = absolutize(href, pageUrl);
      if (absolute) return absolute;
    }
  }

  return null;
}

export function parseProductHtml(html: string, pageUrl: string): ProductDetails {
  const doc = parseHtml(html);

  const description =
    textOf(doc.querySelector("[itemprop='description']")) ||
    textOf(doc.querySelector(".product-detail-body > p")) ||
    undefined;

  const bullets = [...doc.querySelectorAll("#feature-bullets li, .sf-bullets li")]
    .map((el) => compact(el.textContent ?? ""))
    .filter((line) => line.length > 8);

  const specs = [...doc.querySelectorAll(".spec-table tr")].flatMap((row) => {
    const label = compact(row.querySelector("th")?.textContent ?? "");
    const value = compact(row.querySelector("td")?.textContent ?? "");
    return label && value ? [{ label, value }] : [];
  });

  const categories = parseCategories(doc, pageUrl, specs);

  const reviews = [
    ...doc.querySelectorAll(".review, article.sf-review, li.review"),
  ].flatMap((node) => {
    const body =
      textOf(node.querySelector(".review-body, .sf-review-body, [itemprop='reviewBody']")) ||
      "";
    if (!body) return [];
    const ratingText =
      node.getAttribute("data-rating") ||
      textOf(node.querySelector("[itemprop='ratingValue'], .review-rating"));
    return [
      {
        author:
          textOf(
            node.querySelector(".review-author, .reviewer, [itemprop='author']"),
          ) || "Customer",
        rating: parseRating(ratingText),
        title: textOf(node.querySelector(".review-title, .sf-review-title, [itemprop='name']")) || undefined,
        body,
        date:
          textOf(node.querySelector("time, .review-age")) ||
          node.querySelector("time")?.getAttribute("datetime") ||
          undefined,
      } satisfies ProductReview,
    ];
  });

  const averageRating = parseRating(
    doc.querySelector("[itemprop='aggregateRating'] [itemprop='ratingValue']")?.textContent ??
      doc.querySelector("[data-average-rating]")?.getAttribute("data-average-rating") ??
      "",
  );
  const reviewCount = parseNumber(
    doc.querySelector("[itemprop='reviewCount'], [data-total-ratings]")?.textContent ??
      doc.querySelector("[data-total-ratings]")?.getAttribute("data-total-ratings") ??
      "",
  );

  const images = [...doc.querySelectorAll("img[src]")]
    .map((img) => absolutize(img.getAttribute("src") ?? "", pageUrl))
    .filter((src): src is string => Boolean(src && !SKIP_IMAGE.test(src)))
    .filter((src, index, all) => all.indexOf(src) === index)
    .slice(0, 6);

  const price = parseMoney(
    doc.querySelector(".deal-current, [itemprop='price'], .sf-price")?.getAttribute("content") ??
      doc.querySelector(".deal-current, [itemprop='price']")?.textContent ??
      doc.querySelector(".sf-price")?.getAttribute("data-price") ??
      "",
  );
  const was = parseMoney(
    doc.querySelector(".deal-original, .sf-list-price, #listPrice")?.getAttribute("data-list-price") ??
      doc.querySelector(".deal-original, #listPrice")?.textContent ??
      "",
  );

  return {
    url: pageUrl,
    description,
    bullets,
    specs,
    categories,
    reviews,
    averageRating,
    reviewCount,
    images,
    price,
    was,
  };
}

const SKIP_CRUMB =
  /^(products|product|home|deals|shop|cart|account|all|search|view all|see all|shop all|all products)$/i;

export async function loadShopCategories(shop: Shop): Promise<string[]> {
  const bases = [
    shop.website,
    ...shop.pagesToMonitor.map((path) => {
      try {
        return new URL(path, shop.website).href;
      } catch {
        return "";
      }
    }),
  ].filter(Boolean);

  const labels: string[] = [];
  for (const url of bases) {
    try {
      const html = await fetchShopHtml(url);
      const doc = parseHtml(html);
      labels.push(...parseCategoryLinks(doc, url));
      labels.push(...parseCategoryNav(doc));
    } catch {
      // try next page
    }
  }
  return uniqueLabels(labels);
}

function parseCategories(
  doc: Document,
  pageUrl: string,
  specs: { label: string; value: string }[],
): string[] {
  const labels: string[] = [];
  const productName = normalize(
    textOf(doc.querySelector("h1[itemprop='name'], #productTitle, .product-detail-head h1, h1")),
  );
  labels.push(...parseCategoryLinks(doc, pageUrl));

  for (const spec of specs) {
    if (/^categor/i.test(spec.label)) labels.push(spec.value);
  }

  const crumbs = doc.querySelectorAll(
    ".crumbs a, .crumbs span, .breadcrumb a, [aria-label='Breadcrumb'] a, .sf-pdp-info nav a",
  );
  for (const node of crumbs) {
    const text = compact(node.textContent ?? "");
    if (
      text &&
      !SKIP_CRUMB.test(text) &&
      normalize(text) !== productName &&
      text.length < 40 &&
      /[a-z0-9]/i.test(text)
    ) {
      labels.push(text);
    }
  }

  const itemprop = textOf(doc.querySelector("[itemprop='category']"));
  if (itemprop) labels.push(itemprop);

  return uniqueLabels(labels);
}

function parseCategoryLinks(doc: Document, pageUrl: string): string[] {
  const labels: string[] = [];
  for (const anchor of doc.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href") ?? "";
    const fromHref = categoryFromHref(href, pageUrl);
    if (!fromHref) continue;
    const text = compact(anchor.textContent ?? "");
    labels.push(text && !SKIP_CRUMB.test(text) && text.length < 40 ? text : fromHref);
  }
  return labels;
}

function parseCategoryNav(doc: Document): string[] {
  const labels: string[] = [];
  const nodes = doc.querySelectorAll(
    "nav .category a, .categories a, .category-list a, .category-nav a, [data-categories] a, .product-cat-list a, .product-category, [data-dept-nav], [data-category]",
  );
  for (const node of nodes) {
    const attr =
      node.getAttribute("data-dept-nav") ||
      node.getAttribute("data-category") ||
      "";
    const text = compact(node.textContent ?? "") || attr;
    if (text && text.length < 40 && !SKIP_CRUMB.test(text)) labels.push(text);
  }
  return labels;
}

function categoryFromHref(href: string, pageUrl: string): string | null {
  try {
    const url = new URL(href, pageUrl);
    const fromQuery = url.searchParams.get("category") || url.searchParams.get("cat");
    if (fromQuery) return labelFromSlug(fromQuery);
    const match = url.pathname.match(/\/(?:categor(?:y|ies)|collections)\/([^/?#]+)/i);
    if (match) return labelFromSlug(decodeURIComponent(match[1]));
  } catch {
    const match = href.match(/[?&]categor(?:y|ies)=([^&]+)/i);
    if (match) return labelFromSlug(decodeURIComponent(match[1]));
  }
  return null;
}

function labelFromSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const label = compact(value);
    const key = label.toLowerCase();
    if (!label || SKIP_CRUMB.test(label) || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function textOf(el: Element | null): string {
  return compact(el?.textContent ?? "");
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return compact(value).toLowerCase();
}

function parseRating(value: string): number | undefined {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const rating = Number(match[1]);
  return Number.isFinite(rating) ? rating : undefined;
}

function parseNumber(value: string): number | undefined {
  const match = value.replace(/,/g, "").match(/(\d+)/);
  if (!match) return undefined;
  return Number(match[1]);
}

function parseMoney(value: string): number | undefined {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  return Number(match[1]);
}

function absolutize(href: string, baseUrl: string): string | null {
  if (!href || href.startsWith("javascript:") || href.startsWith("#")) return null;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}
