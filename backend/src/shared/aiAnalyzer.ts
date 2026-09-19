import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import OpenAI from "openai";
import { z } from "zod";
import { contentToPromptText } from "./extractContent.js";
import type { ExtractedContent, SaleAnalysis, SaleItem } from "./types.js";

const ssmClient = new SSMClient({});

const SaleTypeSchema = z.enum([
  "percentage_discount",
  "fixed_discount",
  "clearance",
  "promotion",
  "other",
]);

const SaleItemSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  saleType: SaleTypeSchema.optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const SaleAnalysisSchema = z.object({
  hasSale: z.boolean(),
  sales: z.array(SaleItemSchema).optional(),
  saleType: SaleTypeSchema.optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) return openaiClient;

  const paramName =
    process.env.OPENAI_API_KEY_PARAM ?? "/sale-scout/openai-api-key";

  const result = await ssmClient.send(
    new GetParameterCommand({
      Name: paramName,
      WithDecryption: true,
    }),
  );

  const apiKey = result.Parameter?.Value;
  if (!apiKey) {
    throw new Error(`SSM parameter ${paramName} not found or empty`);
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

const SYSTEM_PROMPT = `You are a sale detection system for retail websites.
Analyze the provided extracted website content and list every distinct discounted product or promotion.

Return JSON only with this exact shape:
{
  "hasSale": boolean,
  "sales": [
    {
      "title": string,
      "summary": string,
      "saleType": "percentage_discount" | "fixed_discount" | "clearance" | "promotion" | "other",
      "discountPercentage": number (0-100, optional),
      "confidence": number (0-1)
    }
  ]
}

Rules:
- hasSale=true when there is at least one clear promotional offer or discounted product
- Emit one sales[] entry per distinct product or deal, not one summary for the whole page
- Use the product name as title when available
- Ignore generic marketing copy without discounts
- Return at most 40 sales
- confidence reflects how certain you are for that item`;

export async function analyzeForSale(
  content: ExtractedContent,
  shopName: string,
): Promise<SaleAnalysis> {
  const client = await getOpenAIClient();

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Shop: ${shopName}\n\nExtracted content:\n${contentToPromptText(content)}`,
      },
    ],
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = SaleAnalysisSchema.parse(JSON.parse(raw));
  return normalizeSaleAnalysis(parsed);
}

function normalizeSaleAnalysis(
  parsed: z.infer<typeof SaleAnalysisSchema>,
): SaleAnalysis {
  const sales: SaleItem[] = (parsed.sales ?? [])
    .map((item) => ({
      title: item.title.trim(),
      summary: item.summary,
      saleType: item.saleType,
      discountPercentage: item.discountPercentage,
      confidence: item.confidence ?? parsed.confidence ?? 0.5,
    }))
    .filter((item) => item.title.length > 0)
    .slice(0, 40);

  if (sales.length === 0 && parsed.hasSale && parsed.title) {
    sales.push({
      title: parsed.title,
      summary: parsed.summary,
      saleType: parsed.saleType,
      discountPercentage: parsed.discountPercentage,
      confidence: parsed.confidence ?? 0.5,
    });
  }

  return {
    hasSale: parsed.hasSale || sales.length > 0,
    sales,
  };
}

export { SaleAnalysisSchema };
