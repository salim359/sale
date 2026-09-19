import type { SQSEvent, SQSRecord } from "aws-lambda";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { analyzeForSale } from "../shared/aiAnalyzer.js";
import { discoverFollowPaths } from "../shared/discoverFollowPaths.js";
import {
  buildSaleRecord,
  countSalesForShop,
  getSaleByFingerprint,
  getSnapshot,
  saveSale,
  saveSnapshot,
  updateSaleDiscount,
} from "../shared/dynamo/sales.js";
import {
  buildNotificationRecord,
  saveNotification,
} from "../shared/dynamo/notifications.js";
import { extractContent } from "../shared/extractContent.js";
import { fetchJson, fetchPage } from "../shared/fetchPage.js";
import {
  computeSaleFingerprint,
  discountValueForFingerprint,
  hashContent,
} from "../shared/hashContent.js";
import { mightContainSale } from "../shared/keywordFilter.js";
import { MAX_SALES_PER_SHOP, remainingShopSaleSlots } from "../shared/limits.js";
import { isShopSelected } from "../shared/dynamo/shops.js";
import type {
  CrawlJob,
  CrawlOutcome,
  ExtractedContent,
  SaleItem,
} from "../shared/types.js";

const sqsClient = new SQSClient({});
const QUEUE_URL = process.env.CRAWL_QUEUE_URL ?? "";

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  const job = JSON.parse(record.body) as CrawlJob;
  let outcome: CrawlOutcome = "error";

  try {
    console.log(
      JSON.stringify({
        message: "Processing crawl job",
        shopId: job.shopId,
        pagePath: job.pagePath,
        pageUrl: job.pageUrl,
        crawlStrategy: job.crawlStrategy,
      }),
    );

    if (!(await isShopSelected(job.shopId))) {
      console.log(
        JSON.stringify({
          message: "Shop is not followed; skipping crawl",
          shopId: job.shopId,
          pagePath: job.pagePath,
        }),
      );
      outcome = "unchanged";
      return;
    }

    if (job.crawlStrategy === "api") {
      outcome = await processApiJob(job);
      return;
    }

    outcome = await processHtmlJob(job);
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Crawl job failed",
        shopId: job.shopId,
        pagePath: job.pagePath,
        error: error instanceof Error ? error.message : String(error),
        outcome,
      }),
    );
    throw error;
  }
}

async function processApiJob(job: CrawlJob): Promise<CrawlOutcome> {
  if (!job.api) {
    throw new Error(`Shop ${job.shopId} is missing api field mapping`);
  }

  const payload = await fetchJson(job.pageUrl);
  const parsed = parseShopApi(payload, job.api, job.pageUrl);

  console.log(
    JSON.stringify({
      message: "API catalog fetched",
      shopId: job.shopId,
      pagePath: job.pagePath,
      itemCount: parsed.extracted.items.length,
      saleCount: parsed.sales.length,
    }),
  );

  return persistDetectedSales(job, parsed.extracted, parsed.sales, {
    skipKeywordFilter: true,
    skipAi: true,
  });
}

async function processHtmlJob(job: CrawlJob): Promise<CrawlOutcome> {
  const html =
    job.crawlStrategy === "browser"
      ? await (await import("../shared/fetchRenderedPage.js")).fetchRenderedPage(
          job.pageUrl,
        )
      : await fetchPage(job.pageUrl);
  const extracted = extractContent(html, job.pageUrl);
  const productCardCount = (html.match(/class="[^"]*product-card/g) ?? [])
    .length;

  console.log(
    JSON.stringify({
      message: "Page fetched",
      shopId: job.shopId,
      pagePath: job.pagePath,
      crawlStrategy: job.crawlStrategy,
      htmlLength: html.length,
      productCardCount,
      headingSample: extracted.headings.slice(0, 8),
    }),
  );

  const outcome = await persistDetectedSales(job, extracted);

  const remaining = remainingShopSaleSlots(await countSalesForShop(job.shopId));
  if (remaining > 0) {
    const followed = await enqueueDiscoveredProductPages(job, html, remaining);
    if (followed > 0) {
      console.log(
        JSON.stringify({
          message: "Discovered product pages enqueued",
          shopId: job.shopId,
          fromPage: job.pagePath,
          enqueued: followed,
          remainingSlots: remaining,
        }),
      );
    }
  }

  return outcome;
}

async function persistDetectedSales(
  job: CrawlJob,
  extracted: ExtractedContent,
  apiSales?: SaleItem[],
  options?: { skipKeywordFilter?: boolean; skipAi?: boolean },
): Promise<CrawlOutcome> {
  const contentHash = hashContent(extracted);
  const existing = await getSnapshot(job.shopId, job.pagePath);

  if (existing?.contentHash === contentHash) {
    console.log(
      JSON.stringify({
        message: "Content unchanged",
        shopId: job.shopId,
        pagePath: job.pagePath,
        outcome: "unchanged",
      }),
    );
    return "unchanged";
  }

  console.log(
    JSON.stringify({
      message: "Content changed",
      shopId: job.shopId,
      pagePath: job.pagePath,
      previousHash: existing?.contentHash ?? null,
      currentHash: contentHash,
    }),
  );

  if (!options?.skipKeywordFilter && !mightContainSale(extracted)) {
    await saveSnapshot(job.shopId, job.pagePath, contentHash, extracted);
    console.log(
      JSON.stringify({
        message: "Skipped keyword filter",
        shopId: job.shopId,
        pagePath: job.pagePath,
        outcome: "skipped_keyword_filter",
      }),
    );
    return "skipped_keyword_filter";
  }

  const slots = remainingShopSaleSlots(await countSalesForShop(job.shopId));
  if (slots === 0) {
    await saveSnapshot(job.shopId, job.pagePath, contentHash, extracted);
    console.log(
      JSON.stringify({
        message: "Shop sale cap reached",
        shopId: job.shopId,
        pagePath: job.pagePath,
        maxSales: MAX_SALES_PER_SHOP,
        outcome: "sale_duplicate",
      }),
    );
    return "sale_duplicate";
  }

  const sales = options?.skipAi
    ? (apiSales ?? [])
    : (await analyzeForSale(extracted, job.shopName)).sales;

  await saveSnapshot(job.shopId, job.pagePath, contentHash, extracted);

  const cappedSales = sales.slice(0, slots);

  if (cappedSales.length === 0) {
    console.log(
      JSON.stringify({
        message: options?.skipAi ? "API catalog had no discounts" : "AI determined no sale",
        shopId: job.shopId,
        pagePath: job.pagePath,
        saleCount: 0,
        outcome: "no_sale",
      }),
    );
    return "no_sale";
  }

  if (!(await isShopSelected(job.shopId))) {
    console.log(
      JSON.stringify({
        message: "Shop unfollowed during crawl; not saving sales",
        shopId: job.shopId,
        pagePath: job.pagePath,
      }),
    );
    return "unchanged";
  }

  let savedCount = 0;
  let duplicateCount = 0;

  for (const item of cappedSales) {
    const title = item.title;
    const summary = item.summary ?? "Promotion detected on page";
    const itemUrl = item.url ?? job.pageUrl;
    const fingerprint = computeSaleFingerprint({
      shopId: job.shopId,
      title,
      discountValue: discountValueForFingerprint(item.discountPercentage),
      url: itemUrl,
    });

    const existingSale = await getSaleByFingerprint(job.shopId, fingerprint);

    if (existingSale) {
      if (
        item.discountPercentage != null &&
        existingSale.discountPercentage != null &&
        item.discountPercentage > existingSale.discountPercentage
      ) {
        await updateSaleDiscount(
          job.shopId,
          existingSale.sk,
          item.discountPercentage,
        );
        await saveNotification(
          buildNotificationRecord({
            type: "discount_increased",
            shopId: job.shopId,
            shopName: job.shopName,
            title,
            summary,
            url: itemUrl,
            discountPercentage: item.discountPercentage,
          }),
        );
        savedCount++;
      } else {
        duplicateCount++;
      }
      continue;
    }

    const sale = buildSaleRecord({
      shopId: job.shopId,
      shopName: job.shopName,
      title,
      summary,
      saleType: item.saleType,
      discountPercentage: item.discountPercentage,
      url: itemUrl,
      confidence: item.confidence,
      fingerprint,
      pagePath: job.pagePath,
    });

    try {
      await saveSale(sale);
      await saveNotification(
        buildNotificationRecord({
          type: "sale_detected",
          shopId: job.shopId,
          shopName: job.shopName,
          title,
          summary,
          url: itemUrl,
          discountPercentage: item.discountPercentage,
        }),
      );
      savedCount++;
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        duplicateCount++;
        continue;
      }
      throw error;
    }
  }

  const outcome: CrawlOutcome = savedCount > 0 ? "sale_saved" : "sale_duplicate";
  console.log(
    JSON.stringify({
      message: "Sales processed",
      shopId: job.shopId,
      pagePath: job.pagePath,
      detectedCount: cappedSales.length,
      savedCount,
      duplicateCount,
      outcome,
    }),
  );
  return outcome;
}

function isConditionalCheckFailed(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ConditionalCheckFailedException"
  );
}

async function enqueueDiscoveredProductPages(
  job: CrawlJob,
  html: string,
  maxJobs: number,
): Promise<number> {
  if (maxJobs <= 0) return 0;
  if (isDetailJob(job)) return 0;
  if (!job.followLinkPattern && !job.followListingPattern) return 0;
  if (!QUEUE_URL) return 0;

  const origin = new URL(job.pageUrl).origin;
  const paths = discoverFollowPaths(html, job.pageUrl, {
    followLinkPattern: job.followLinkPattern,
    followListingPattern: job.followListingPattern,
    currentPath: job.pagePath,
    allowAllListings: (job.depth ?? 0) === 0,
  }).slice(0, maxJobs);

  let enqueued = 0;
  for (const { pagePath, kind } of paths) {
    const followJob: CrawlJob = {
      shopId: job.shopId,
      shopName: job.shopName,
      pagePath,
      pageUrl: buildPageUrl(origin, pagePath),
      crawlStrategy: job.crawlStrategy,
      followLinkPattern: job.followLinkPattern,
      followListingPattern: job.followListingPattern,
      api: job.api,
      depth: (job.depth ?? 0) + 1,
      kind,
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(followJob),
      }),
    );
    enqueued++;
  }

  return enqueued;
}

function isDetailJob(job: CrawlJob): boolean {
  if (job.kind === "listing") return false;
  if (job.kind === "detail") return true;
  return (job.depth ?? 0) > 0;
}
