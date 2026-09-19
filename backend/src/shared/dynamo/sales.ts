import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ExtractedContent, PageSnapshot, SaleRecord } from "../types.js";
import {
  docClient,
  pageSk,
  salesByDatePk,
  salesByDateSk,
  saleSk,
  shopPk,
  TABLE_NAME,
  todayDate,
} from "./client.js";

export async function getSnapshot(
  shopId: string,
  pagePath: string,
): Promise<PageSnapshot | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: shopPk(shopId), sk: pageSk(pagePath) },
    }),
  );
  return (result.Item as PageSnapshot) ?? null;
}

export async function saveSnapshot(
  shopId: string,
  pagePath: string,
  contentHash: string,
  extractedContent: ExtractedContent,
): Promise<void> {
  const item: PageSnapshot = {
    pk: shopPk(shopId),
    sk: pageSk(pagePath),
    contentHash,
    extractedContent: truncateExtractedContent(extractedContent),
    lastCheckedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );
}

function truncateExtractedContent(
  content: ExtractedContent,
): ExtractedContent {
  return {
    ...content,
    rawTextSample: content.rawTextSample.slice(0, 2000),
    promoText: content.promoText.slice(0, 20),
    headings: content.headings.slice(0, 20),
    prices: content.prices.slice(0, 20),
    links: content.links.slice(0, 20),
    items: content.items.slice(0, 40),
  };
}

export async function getSaleByFingerprint(
  shopId: string,
  fingerprint: string,
): Promise<SaleRecord | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
      FilterExpression: "fingerprint = :fingerprint",
      ExpressionAttributeValues: {
        ":pk": shopPk(shopId),
        ":skPrefix": "SALE#",
        ":fingerprint": fingerprint,
      },
      Limit: 10,
    }),
  );

  return (result.Items?.[0] as SaleRecord) ?? null;
}

export async function saveSale(sale: SaleRecord): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: sale,
      ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
    }),
  );
}

export async function updateSaleDiscount(
  shopId: string,
  existingSk: string,
  discountPercentage: number,
): Promise<void> {
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: shopPk(shopId), sk: existingSk },
    }),
  );

  if (!existing.Item) return;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...existing.Item,
        discountPercentage,
        detectedAt: new Date().toISOString(),
      },
    }),
  );
}

export async function getSalesByDate(date: string): Promise<SaleRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "SalesByDateIndex",
      KeyConditionExpression: "gsi1pk = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": salesByDatePk(date),
      },
      ScanIndexForward: false,
    }),
  );

  return (result.Items as SaleRecord[]) ?? [];
}

export function buildSaleRecord(params: {
  shopId: string;
  shopName: string;
  title: string;
  summary: string;
  saleType?: string;
  discountPercentage?: number;
  url: string;
  confidence: number;
  fingerprint: string;
  pagePath: string;
}): SaleRecord {
  const detectedAt = new Date().toISOString();
  const date = todayDate();

  return {
    pk: shopPk(params.shopId),
    sk: saleSk(date, params.fingerprint),
    gsi1pk: salesByDatePk(date),
    gsi1sk: salesByDateSk(params.shopId, detectedAt, params.fingerprint),
    shopId: params.shopId,
    shopName: params.shopName,
    title: params.title,
    summary: params.summary,
    saleType: params.saleType as SaleRecord["saleType"],
    discountPercentage: params.discountPercentage,
    url: params.url,
    confidence: params.confidence,
    fingerprint: params.fingerprint,
    detectedAt,
    pagePath: params.pagePath,
  };
}
