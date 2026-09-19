import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Shop, ShopRecord } from "../types.js";
import {
  docClient,
  shopPk,
  shopsIndexPk,
  shopsIndexSk,
  TABLE_NAME,
} from "./client.js";
import { toPublicShop } from "../shops.js";

const SHOP_METADATA_SK = "METADATA";
const SHOPS_INDEX = "SalesByDateIndex";

export async function upsertShop(shop: Shop): Promise<Shop> {
  const item: ShopRecord = {
    ...shop,
    pk: shopPk(shop.shopId),
    sk: SHOP_METADATA_SK,
    gsi1pk: shopsIndexPk(),
    gsi1sk: shopsIndexSk(shop.shopId),
    selectedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return toPublicShop(shop);
}

export async function getAllShops(): Promise<Shop[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: SHOPS_INDEX,
      KeyConditionExpression: "gsi1pk = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": shopsIndexPk(),
      },
    }),
  );

  return (result.Items ?? []).map((item) => toPublicShop(item as ShopRecord));
}

export async function getSelectedShopIds(): Promise<Set<string>> {
  const shops = await getAllShops();
  return new Set(shops.map((shop) => shop.shopId));
}

export async function deleteShop(shopId: string): Promise<boolean> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: shopPk(shopId), sk: SHOP_METADATA_SK },
        ConditionExpression: "attribute_exists(pk)",
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw error;
  }
}
