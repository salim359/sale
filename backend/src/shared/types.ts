export type CrawlStrategy = "http" | "https" | "api" | "browser";

export interface ShopApiMapping {
  itemsPath?: string;
  title: string;
  price: string;
  originalPrice?: string;
  discountPercentage?: string;
  url?: string;
  summary?: string;
}

export interface Shop {
  shopId: string;
  name: string;
  website: string;
  pagesToMonitor: string[];
  crawlStrategy: CrawlStrategy;
  followLinkPattern?: string;
  followListingPattern?: string;
  api?: ShopApiMapping;
}

export interface CrawlJob {
  shopId: string;
  shopName: string;
  pagePath: string;
  pageUrl: string;
  crawlStrategy: CrawlStrategy;
  followLinkPattern?: string;
  followListingPattern?: string;
  api?: ShopApiMapping;
  depth?: number;
  kind?: "listing" | "detail";
}

export interface ExtractedContent {
  title: string;
  headings: string[];
  promoText: string[];
  prices: string[];
  links: string[];
  items: string[];
  rawTextSample: string;
}

export interface PageSnapshot {
  pk: string;
  sk: string;
  contentHash: string;
  extractedContent: ExtractedContent;
  lastCheckedAt: string;
}

export interface ShopRecord extends Shop {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  selectedAt: string;
  lastChecked?: string;
}

export interface CatalogShop extends Shop {
  selected: boolean;
}

export type SaleType =
  | "percentage_discount"
  | "fixed_discount"
  | "clearance"
  | "promotion"
  | "other";

export interface SaleItem {
  title: string;
  summary?: string;
  saleType?: SaleType;
  discountPercentage?: number;
  confidence: number;
  url?: string;
}

export interface SaleAnalysis {
  hasSale: boolean;
  sales: SaleItem[];
}

export interface SaleRecord {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  shopId: string;
  shopName: string;
  title: string;
  summary: string;
  saleType?: SaleType;
  discountPercentage?: number;
  url: string;
  confidence: number;
  fingerprint: string;
  detectedAt: string;
  pagePath: string;
}

export type CrawlOutcome =
  | "unchanged"
  | "skipped_keyword_filter"
  | "no_sale"
  | "sale_saved"
  | "sale_duplicate"
  | "error";

export type NotificationType = "sale_detected" | "discount_increased";

export interface NotificationRecord {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  notificationId: string;
  type: NotificationType;
  shopId: string;
  shopName: string;
  title: string;
  summary: string;
  url: string;
  discountPercentage?: number;
  read: boolean;
  createdAt: string;
}
