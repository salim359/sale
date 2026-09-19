import * as cheerio from "cheerio";
import type { ExtractedContent } from "./types.js";

const PROMO_SELECTORS = [
  "[class*='promo']",
  "[class*='sale']",
  "[class*='banner']",
  "[class*='offer']",
  "[class*='discount']",
  "[class*='clearance']",
  "[data-testid*='promo']",
  "[data-testid*='sale']",
];

const ITEM_SELECTORS = [
  ".product-card",
  ".deal-card",
  "[class*='deal-item']",
  "[class*='product-card']",
  "article",
  "li",
];

const PRICE_PATTERN =
  /(?:\$|€|£|USD|EUR|GBP)\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:%|percent)\s?off|\d+\s?%\s?off/gi;

const DISCOUNT_PATTERN =
  /\b(?:up to|save|get)\s+\d+\s?%\s?(?:off|discount)?|\b\d+\s?%\s?off\b|\bclearance\b|\bspecial offer\b|\blimited time\b|\bflash sale\b/gi;

const ITEM_SIGNAL =
  /\$\s?\d|\d+\s?%|−\d+%|-\d+%|off|expires|sale|discount/i;

export function extractContent(html: string, baseUrl: string): ExtractedContent {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").first().text().trim();
  const headings = $("h1, h2, h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const promoText: string[] = [];
  for (const selector of PROMO_SELECTORS) {
    $(selector).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length >= 8 && text.length <= 300) {
        promoText.push(text);
      }
    });
  }

  const items = extractSaleItems($);
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const discountMatches = bodyText.match(DISCOUNT_PATTERN) ?? [];
  const priceMatches = bodyText.match(PRICE_PATTERN) ?? [];

  const links = $("a[href]")
    .map((_, el) => {
      const href = $(el).attr("href");
      if (!href) return null;
      try {
        return new URL(href, baseUrl).href;
      } catch {
        return null;
      }
    })
    .get()
    .filter((link): link is string => Boolean(link))
    .filter((link, index, arr) => arr.indexOf(link) === index)
    .slice(0, 40);

  return {
    title,
    headings: uniqueStrings([...headings, ...promoText]).slice(0, 40),
    promoText: uniqueStrings([...promoText, ...discountMatches]).slice(0, 40),
    prices: uniqueStrings(priceMatches).slice(0, 40),
    links,
    items,
    rawTextSample: bodyText.slice(0, 6000),
  };
}

function extractSaleItems($: cheerio.CheerioAPI): string[] {
  const items: string[] = [];

  for (const selector of ITEM_SELECTORS) {
    $(selector).each((_, el) => {
      if ($(el).parents(ITEM_SELECTORS.join(", ")).length > 0) return;
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length < 16 || text.length > 400) return;
      if (!ITEM_SIGNAL.test(text)) return;
      items.push(text);
    });
  }

  return uniqueStrings(items).slice(0, 40);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function contentToPromptText(content: ExtractedContent): string {
  return JSON.stringify(
    {
      title: content.title,
      headings: content.headings.slice(0, 15),
      promoText: content.promoText.slice(0, 15),
      prices: content.prices.slice(0, 20),
      items: content.items.slice(0, 40),
      sampleText: content.rawTextSample.slice(0, 4000),
    },
    null,
    2,
  );
}
