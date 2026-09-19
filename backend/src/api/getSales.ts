import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { getSalesByDate } from "../shared/dynamo/sales.js";
import { getSelectedShopIds } from "../shared/dynamo/shops.js";
import { todayDate } from "../shared/dynamo/client.js";
import { jsonResponse } from "./http.js";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const date = event.queryStringParameters?.date ?? todayDate();
    const [sales, selectedIds] = await Promise.all([
      getSalesByDate(date),
      getSelectedShopIds(),
    ]);
    const followed = sales.filter((sale) => selectedIds.has(sale.shopId));

    return jsonResponse(200, {
      date,
      count: followed.length,
      sales: followed.map((sale) => ({
        shopId: sale.shopId,
        shopName: sale.shopName,
        title: sale.title,
        summary: sale.summary,
        discountPercentage: sale.discountPercentage,
        url: sale.url,
        confidence: sale.confidence,
        detectedAt: sale.detectedAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, {
      message: "Failed to fetch sales",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
