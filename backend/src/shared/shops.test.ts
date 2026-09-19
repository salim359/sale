import { describe, expect, it } from "vitest";
import {
  buildPageUrl,
  getCatalogShop,
  loadCatalogShops,
  resolveCatalogShops,
} from "./shops.js";

describe("shop catalog", () => {
  it("loads unique predefined shops", () => {
    const shops = loadCatalogShops();
    const ids = shops.map((shop) => shop.shopId);

    expect(shops.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves known shop ids from the catalog", () => {
    const first = loadCatalogShops()[0];
    const { shops, unknown } = resolveCatalogShops([first.shopId, first.shopId]);

    expect(unknown).toEqual([]);
    expect(shops).toHaveLength(1);
    expect(shops[0]?.shopId).toBe(first.shopId);
  });

  it("reports shop ids that are not in the catalog", () => {
    const { shops, unknown } = resolveCatalogShops(["not-a-real-shop"]);

    expect(shops).toEqual([]);
    expect(unknown).toEqual(["not-a-real-shop"]);
  });

  it("includes Scrapify Playground in the catalog", () => {
    const shop = getCatalogShop("scrapify");

    expect(shop?.name).toBe("Scrapify Playground");
    expect(shop?.website).toBe("https://scrapifydatalabs.com");
    expect(shop?.pagesToMonitor).toEqual([
      "/playground/static-products.html",
      "/playground/ecommerce/",
    ]);
    expect(shop?.followLinkPattern).toBe(
      "/playground/ecommerce/product-",
    );
  });

  it("includes Scrapify JS playground as a browser crawl", () => {
    const shop = getCatalogShop("scrapify-js");

    expect(shop?.crawlStrategy).toBe("browser");
    expect(shop?.pagesToMonitor).toEqual([
      "/playground/js-rendered.html",
      "/playground/ajax-load-more.html",
    ]);
  });

  it("includes Catalog108 deals as an HTTP crawl", () => {
    const shop = getCatalogShop("catalog108");

    expect(shop?.name).toBe("Catalog108 Deals");
    expect(shop?.website).toBe("https://practice.scrapingcentral.com");
    expect(shop?.crawlStrategy).toBe("https");
    expect(shop?.pagesToMonitor).toEqual(["/deals", "/products"]);
    expect(shop?.followLinkPattern).toBe("/products/");
    expect(shop?.followListingPattern).toBe("/products?category=");
  });

  it("builds a page url from website and path", () => {
    expect(buildPageUrl("https://www.nike.com/", "sale")).toBe(
      "https://www.nike.com/sale",
    );
    expect(buildPageUrl("https://www.nike.com", "/sale")).toBe(
      "https://www.nike.com/sale",
    );
  });
});
