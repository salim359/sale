import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { ScheduledEvent } from "aws-lambda";
import { getAllShops } from "../shared/dynamo/shops.js";
import { buildPageUrl } from "../shared/shops.js";
import type { CrawlJob } from "../shared/types.js";

const sqsClient = new SQSClient({});
const QUEUE_URL = process.env.CRAWL_QUEUE_URL ?? "";

export const handler = async (_event: ScheduledEvent): Promise<void> => {
  const shops = await getAllShops();
  console.log(
    JSON.stringify({
      message: "Selected shops loaded",
      count: shops.length,
    }),
  );

  if (shops.length === 0) {
    console.log(
      JSON.stringify({
        message: "No selected shops; skipping enqueue",
      }),
    );
    return;
  }

  let enqueued = 0;

  for (const shop of shops) {
    for (const pagePath of shop.pagesToMonitor) {
      const job: CrawlJob = {
        shopId: shop.shopId,
        shopName: shop.name,
        pagePath,
        pageUrl: buildPageUrl(shop.website, pagePath),
        crawlStrategy: shop.crawlStrategy,
        followLinkPattern: shop.followLinkPattern,
        followListingPattern: shop.followListingPattern,
        depth: 0,
        kind: "listing",
      };

      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify(job),
        }),
      );

      enqueued++;
    }
  }

  console.log(JSON.stringify({ message: "Crawl jobs enqueued", enqueued }));
};
