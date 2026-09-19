# Sale Scout

Backend pipeline that monitors retail shop pages, detects content changes, and uses AI to identify sales.

## Architecture

EventBridge (4h) → Scheduler Lambda → SQS → Crawler Lambda → DynamoDB (+ OpenAI when content changes)

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
cd sale-scout
npm install
npm test
sam build
sam deploy
```

## Manual trigger

```bash
aws lambda invoke \
  --function-name sale-scout-SchedulerFunction-XXXX \
  --payload '{}' \
  /tmp/scheduler-out.json
```

## Check detected sales

```bash
curl "https://YOUR_API.execute-api.us-east-1.amazonaws.com/Prod/sales"
curl "https://YOUR_API.execute-api.us-east-1.amazonaws.com/Prod/sales?date=2026-09-02"
```

## Pipeline stages

1. Fetch page (HTTP)
2. Extract structured content (Cheerio)
3. SHA-256 hash compare — skip if unchanged
4. Keyword pre-filter — skip if no sale signals
5. OpenAI JSON analysis — only on possible sales
6. Fingerprint dedup — save new sales only

## Project structure

```
src/
  scheduler/   EventBridge → enqueue crawl jobs
  crawler/     SQS → fetch, hash, AI, save
  api/         GET /sales
  shared/      types, extractors, DynamoDB, AI
shops/
  seed-shops.json
```
