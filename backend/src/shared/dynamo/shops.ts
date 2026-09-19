import {
  BatchWriteCommand,
  GetCommand,
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

export async function isShopSelected(shopId: string): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: shopPk(shopId), sk: SHOP_METADATA_SK },
    }),
  );
  return Boolean(result.Item);
}

export async function deleteShop(shopId: string): Promise<boolean> {
  if (!(await isShopSelected(shopId))) {
    return false;
  }

  await deleteShopPartition(shopId);
  return true;
}

async function deleteShopPartition(shopId: string): Promise<void> {
  const pk = shopPk(shopId);
  let startKey: Record<string, string> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ProjectionExpression: "pk, sk",
        ExclusiveStartKey: startKey,
      }),
    );

    const keys = (result.Items ?? []) as { pk: string; sk: string }[];
    for (let i = 0; i < keys.length; i += 25) {
      const chunk = keys.slice(i, i + 25);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: chunk.map((key) => ({
              DeleteRequest: { Key: { pk: key.pk, sk: key.sk } },
            })),
          },
        }),
      );
    }

    startKey = result.LastEvaluatedKey as Record<string, string> | undefined;
  } while (startKey);
}
