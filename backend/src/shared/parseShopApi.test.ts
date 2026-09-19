import { describe, expect, it } from "vitest";
import {
  getByPath,
  parsePrice,
  parseShopApi,
} from "./parseShopApi.js";

const mapping = {
  itemsPath: "products",
  title: "name",
  price: "price",
  originalPrice: "compareAt",
  url: "url",
};

describe("parseShopApi", () => {
  it("maps discounted products to sales", () => {
    const parsed = parseShopApi(
      {
        products: [
          {
            name: "Linen Desk",
            price: 80,
            compareAt: 100,
            url: "/products/linen-desk",
          },
          {
            name: "Full price mug",
            price: 12,
            compareAt: 12,
          },
        ],
      },
      mapping,
      "https://shop.example.com/api/products",
    );

    expect(parsed.sales).toHaveLength(1);
    expect(parsed.sales[0]).toMatchObject({
      title: "Linen Desk",
      discountPercentage: 20,
      confidence: 1,
      url: "https://shop.example.com/products/linen-desk",
    });
    expect(parsed.extracted.headings).toContain("Linen Desk");
    expect(parsed.extracted.headings).toContain("Full price mug");
  });

  it("reads a root array when itemsPath is omitted", () => {
    const parsed = parseShopApi(
      [{ name: "Sale lamp", price: "19.99", compareAt: "$40" }],
      {
        title: "name",
        price: "price",
        originalPrice: "compareAt",
      },
      "https://shop.example.com/sale.json",
    );

    expect(parsed.sales).toHaveLength(1);
    expect(parsed.sales[0]?.discountPercentage).toBe(50);
  });

  it("maps DummyJSON discountPercentage fields", () => {
    const parsed = parseShopApi(
      {
        products: [
          {
            id: 1,
            title: "Essence Mascara Lash Princess",
            description: "Volumizing mascara",
            price: 9.99,
            discountPercentage: 10.48,
          },
        ],
      },
      {
        itemsPath: "products",
        title: "title",
        price: "price",
        discountPercentage: "discountPercentage",
        summary: "description",
      },
      "https://dummyjson.com/products",
    );

    expect(parsed.sales).toHaveLength(1);
    expect(parsed.sales[0]).toMatchObject({
      title: "Essence Mascara Lash Princess",
      summary: "Volumizing mascara",
      discountPercentage: 10,
      url: "https://dummyjson.com/products/1",
    });
  });

  it("throws when itemsPath is not an array", () => {
    expect(() =>
      parseShopApi({ products: { name: "nope" } }, mapping, "https://shop.example.com"),
    ).toThrow(/itemsPath/);
  });
});

describe("getByPath", () => {
  it("walks dotted paths", () => {
    expect(getByPath({ data: { items: [1] } }, "data.items")).toEqual([1]);
  });
});

describe("parsePrice", () => {
  it("parses numbers and currency strings", () => {
    expect(parsePrice(19.5)).toBe(19.5);
    expect(parsePrice("$1,299.00")).toBe(1299);
    expect(parsePrice("n/a")).toBeUndefined();
  });
});
