# Sale Scout

Backend pipeline that monitors followed shop pages, detects content changes, and records discounts.

## Architecture

```text
EventBridge (4h)
  → Scheduler (followed shops only)
  → SQS
  → Crawler
      ├── skip if shop unfollowed
      ├── http/https  fetch + Cheerio
      ├── browser     Puppeteer + chromium-min
      └── api         JSON mapping (no OpenAI)
  → DynamoDB PAGE# snapshot + SALE# (max 10 / shop)
  → Notifications table
```

Following a shop only writes `SHOP#{id} / METADATA`. Crawl jobs start on the next scheduler run, not on follow.

## Prerequisites

- AWS CLI configured
- SAM CLI (`sam --version`)
- Node.js 20+
- OpenAI API key stored in SSM:

```bash
aws ssm put-parameter \
  --name "/sale-scout/openai-api-key" \
  --value "sk-..." \
  --type SecureString \
  --overwrite
```

## Setup

```bash
cd backend
npm install
npm test
npm run deploy
```

`npm run deploy` is `sam build && sam deploy`. The crawler is bundled by `Makefile` (esbuild + `crawler-package.json` install) so `@sparticuz/chromium-min` lands in the Lambda package.

## Catalog

Shops live in `shops/catalog.json` and are **imported into Lambda at build time**. Edit that file and redeploy. You cannot change the catalog from the AWS console.

| shopId | crawlStrategy | Notes |
| --- | --- | --- |
| `catalog108` | `browser` | JS-rendered deals/products |
| `dummyjson` | `api` | `https://dummyjson.com/products` |
| `scrapify-js` | `browser` | JS playground + load-more |

`crawlStrategy` values: `http`, `https`, `api`, `browser`.

Optional discovery patterns on a shop:

- `followLinkPattern` — product/detail paths to enqueue
- `followListingPattern` — extra listing URLs (for example `/products?category=`)
- `api` — JSON field mapping for `api` shops

## Data model

```text
sale-scout-table
  SHOP#{shopId}
    METADATA            followed shop + crawl config
    PAGE#{path}         last extract + contentHash
    SALE#{date}#{fp}    detected discount

sale-scout-notifications
  notification rows
```

Unfollow (`DELETE /shops/{shopId}`) deletes the whole shop partition and that shop’s notifications. The crawler also checks `isShopSelected` before fetch and before save, so leftover SQS jobs do not recreate sales.

`GET /sales` and `GET /notifications` only return rows for currently followed shops.

## Pipeline stages

1. Scheduler enqueues `pagesToMonitor` for followed shops
2. Fetch page (HTTP, Chromium, or JSON API)
3. Extract content (Cheerio for HTML)
4. SHA-256 hash compare — skip if `PAGE#` unchanged
5. Keyword pre-filter — skip HTML pages with no sale signals
6. OpenAI JSON analysis (HTML) or mapped discounts (API)
7. Fingerprint dedup — insert new sales, or update if the discount increased
8. Cap at **10 sales per shop**; enqueue follow links only while slots remain

## Browser crawls

Lambda downloads Chromium at runtime from:

```text
https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.x64.tar
```

That URL is `CHROMIUM_PACK_URL` on `CrawlerFunction`. The old `chromium-v153.0.0-pack.tar` asset 404s.

## Manual trigger

Use the scheduler ARN from `sam deploy` outputs (`SchedulerFunctionArn`):

```bash
aws lambda invoke \
  --function-name sale-scout-SchedulerFunction-VnJMkGONYIM0 \
  --payload '{}' \
  /tmp/scheduler-out.json
```

## Check detected sales

These routes require a Cognito JWT except where noted. After login:

```bash
curl "https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod/shops/catalog"
curl "https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod/sales"
```

## Deployed stack (`sale-scout`, `us-east-1`)

```text
API            https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod
Catalog        https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod/shops/catalog
Shops          https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod/shops
Notifications  https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod/notifications
Signup         https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod/auth/signup
Login          https://mkntb4mjx9.execute-api.us-east-1.amazonaws.com/Prod/auth/login
Table          sale-scout-table
Notifications  sale-scout-notifications
User pool      us-east-1_K7Sch2j5P
App client     3ql4tkej8atd6n5m7hsosruqto
```

## API

```text
POST   /auth/signup
POST   /auth/confirm
POST   /auth/login
POST   /auth/refresh
POST   /auth/resend
GET    /auth/me

GET    /shops/catalog
GET    /shops
POST   /shops
DELETE /shops/{shopId}

GET    /sales?date=YYYY-MM-DD

GET    /notifications
POST   /notifications/{notificationId}/read
```

## Project structure

```text
src/
  scheduler/   EventBridge → enqueue crawl jobs
  crawler/     SQS → fetch, hash, detect, save
  api/         auth, shops, sales, notifications
  shared/      types, extractors, DynamoDB, AI, limits
shops/
  catalog.json
```
