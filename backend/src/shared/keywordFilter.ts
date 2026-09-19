import type { ExtractedContent } from "./types.js";

const SALE_KEYWORDS = [
  "sale",
  "clearance",
  "promo",
  "promotion",
  "offer",
  "discount",
  "off",
  "deal",
  "save",
  "reduced",
  "special price",
  "limited time",
  "flash",
  "end of season",
  "black friday",
  "cyber monday",
];

const PERCENT_PATTERN = /\d+\s?%\s?off|\d+\s?percent|\bup to \d+/i;

export function mightContainSale(content: ExtractedContent): boolean {
  const searchable = [
    content.title,
    ...content.headings,
    ...content.promoText,
    ...content.prices,
    ...content.items,
    content.rawTextSample,
  ]
    .join(" ")
    .toLowerCase();

  const hasKeyword = SALE_KEYWORDS.some((keyword) =>
    searchable.includes(keyword),
  );
  const hasPercent = PERCENT_PATTERN.test(searchable);

  return hasKeyword || hasPercent;
}
