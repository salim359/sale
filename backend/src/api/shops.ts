import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { z } from "zod";
import {
  deleteShop,
  getAllShops,
  getSelectedShopIds,
  upsertShop,
} from "../shared/dynamo/shops.js";
import {
  loadCatalogShops,
  resolveCatalogShops,
  toPublicShop,
} from "../shared/shops.js";
import { emptyResponse, jsonResponse } from "./http.js";

const SelectShopsSchema = z.object({
  shopIds: z.array(z.string().min(1)).min(1),
});

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return emptyResponse(204);
    }

    const resource = event.resource;
    const method = event.httpMethod;

    if (method === "GET" && resource === "/shops/catalog") {
      return await listCatalog();
    }

    if (method === "GET" && resource === "/shops") {
      return await listSelected();
    }

    if (method === "POST" && resource === "/shops") {
      return await selectShops(event.body);
    }

    if (method === "DELETE" && resource === "/shops/{shopId}") {
      return await removeShop(event.pathParameters?.shopId);
    }

    return jsonResponse(404, { message: "Not found" });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, {
      message: "Failed to process shops request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function listCatalog(): Promise<APIGatewayProxyResult> {
  const selected = await getSelectedShopIds();
  const shops = loadCatalogShops().map((shop) => ({
    ...toPublicShop(shop),
    selected: selected.has(shop.shopId),
  }));

  return jsonResponse(200, { count: shops.length, shops });
}

async function listSelected(): Promise<APIGatewayProxyResult> {
  const shops = await getAllShops();
  return jsonResponse(200, { count: shops.length, shops });
}

async function selectShops(
  rawBody: string | null,
): Promise<APIGatewayProxyResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody ?? "");
  } catch {
    return jsonResponse(400, { message: "Request body must be JSON" });
  }

  const body = SelectShopsSchema.safeParse(parsed);
  if (!body.success) {
    return jsonResponse(400, {
      message: "Body must be { shopIds: string[] } with at least one id",
    });
  }

  const { shops, unknown } = resolveCatalogShops(body.data.shopIds);
  if (unknown.length > 0) {
    return jsonResponse(400, {
      message: "Unknown shopIds are not in the catalog",
      unknown,
    });
  }

  const saved = await Promise.all(shops.map((shop) => upsertShop(shop)));
  return jsonResponse(200, { count: saved.length, shops: saved });
}

async function removeShop(
  shopId: string | undefined,
): Promise<APIGatewayProxyResult> {
  if (!shopId) {
    return jsonResponse(400, { message: "shopId is required" });
  }

  const removed = await deleteShop(shopId);
  if (!removed) {
    return jsonResponse(404, { message: `Shop ${shopId} is not selected` });
  }

  return jsonResponse(200, { shopId, removed: true });
}
