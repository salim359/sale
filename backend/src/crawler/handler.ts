import type { SQSEvent, SQSRecord } from "aws-lambda";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { analyzeForSale } from "../shared/aiAnalyzer.js";
import { discoverFollowPaths } from "../shared/discoverFollowPaths.js";
import {
  buildSaleRecord,
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
import { fetchPage } from "../shared/fetchPage.js";
import { fetchRenderedPage } from "../shared/fetchRenderedPage.js";
import {
  computeSaleFingerprint,
  discountValueForFingerprint,
  hashContent,
} from "../shared/hashContent.js";
import { mightContainSale } from "../shared/keywordFilter.js";
import { buildPageUrl } from "../shared/shops.js";
import type { CrawlJob, CrawlOutcome } from "../shared/types.js";

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

    const html =
      job.crawlStrategy === "browser"
        ? await fetchRenderedPage(job.pageUrl)
        : await fetchPage(job.pageUrl);
    const extracted = extractContent(html, job.pageUrl);
    const contentHash = hashContent(extracted);
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

    const followed = await enqueueDiscoveredProductPages(job, html);
    if (followed > 0) {
      console.log(
        JSON.stringify({
          message: "Discovered product pages enqueued",
          shopId: job.shopId,
          fromPage: job.pagePath,
          enqueued: followed,
        }),
      );
    }

    const existing = await getSnapshot(job.shopId, job.pagePath);

    if (existing?.contentHash === contentHash) {
      outcome = "unchanged";
      await saveSnapshot(job.shopId, job.pagePath, contentHash, extracted);
      console.log(
        JSON.stringify({
          message: "Content unchanged",
          shopId: job.shopId,
          pagePath: job.pagePath,
          outcome,
        }),
      );
      return;
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

    if (!mightContainSale(extracted)) {
      outcome = "skipped_keyword_filter";
      await saveSnapshot(job.shopId, job.pagePath, contentHash, extracted);
      console.log(
        JSON.stringify({
          message: "Skipped keyword filter",
          shopId: job.shopId,
          pagePath: job.pagePath,
          outcome,
        }),
      );
      return;
    }

    const analysis = await analyzeForSale(extracted, job.shopName);
    await saveSnapshot(job.shopId, job.pagePath, contentHash, extracted);

    if (!analysis.hasSale || analysis.sales.length === 0) {
      outcome = "no_sale";
      console.log(
        JSON.stringify({
          message: "AI determined no sale",
          shopId: job.shopId,
          pagePath: job.pagePath,
          saleCount: 0,
          outcome,
        }),
      );
      return;
    }

    let savedCount = 0;
    let duplicateCount = 0;

    for (const item of analysis.sales) {
      const title = item.title;
      const summary = item.summary ?? "Promotion detected on page";
      const fingerprint = computeSaleFingerprint({
        shopId: job.shopId,
        title,
        discountValue: discountValueForFingerprint(item.discountPercentage),
        url: job.pageUrl,
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
              url: job.pageUrl,
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
        url: job.pageUrl,
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
            url: job.pageUrl,
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

    outcome = savedCount > 0 ? "sale_saved" : "sale_duplicate";
    console.log(
      JSON.stringify({
        message: "Sales processed",
        shopId: job.shopId,
        pagePath: job.pagePath,
        detectedCount: analysis.sales.length,
        savedCount,
        duplicateCount,
        outcome,
      }),
    );
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
): Promise<number> {
  if (isDetailJob(job)) return 0;
  if (!job.followLinkPattern && !job.followListingPattern) return 0;
  if (!QUEUE_URL) return 0;

  const origin = new URL(job.pageUrl).origin;
  const paths = discoverFollowPaths(html, job.pageUrl, {
    followLinkPattern: job.followLinkPattern,
    followListingPattern: job.followListingPattern,
    currentPath: job.pagePath,
    allowAllListings: (job.depth ?? 0) === 0,
  });

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
