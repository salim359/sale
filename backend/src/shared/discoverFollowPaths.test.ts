import { describe, expect, it } from "vitest";
import {
  discoverFollowPaths,
  isFollowTarget,
} from "./discoverFollowPaths.js";

describe("discoverFollowPaths", () => {
  it("collects every product detail link from a listing page", () => {
    const html = `
      <html>
        <body>
          <a href="/products">All products</a>
          <a href="/products/334-black-wooden-cable">Black Wooden Cable</a>
          <a href="https://practice.scrapingcentral.com/products/12-red-linen-desk">Red Linen Desk</a>
          <a href="/deals">Deals</a>
          <a href="https://example.com/products/99-other-site">Other site</a>
        </body>
      </html>
    `;

    const paths = discoverFollowPaths(
      html,
      "https://practice.scrapingcentral.com/deals",
      "/products/",
      "/deals",
    );

    expect(paths).toEqual([
      {
        pagePath: "/products/334-black-wooden-cable",
        kind: "detail",
      },
      { pagePath: "/products/12-red-linen-desk", kind: "detail" },
    ]);
  });

  it("matches product ids and ignores the products index", () => {
    expect(isFollowTarget("/products/334-black-wooden-cable", "/products/")).toBe(
      true,
    );
    expect(isFollowTarget("/products", "/products/")).toBe(false);
    expect(isFollowTarget("/deals", "/products/")).toBe(false);
  });

  it("matches Scrapify SKU product pages", () => {
    expect(
      isFollowTarget(
        "/playground/ecommerce/product-sf-b0np1001",
        "/playground/ecommerce/product-",
      ),
    ).toBe(true);
    expect(
      isFollowTarget(
        "/playground/ecommerce/",
        "/playground/ecommerce/product-",
      ),
    ).toBe(false);
  });

  it("collects Scrapify ecommerce product detail pages", () => {
    const html = `
      <html>
        <body>
          <a href="/playground/ecommerce/">Search results</a>
          <a href="/playground/ecommerce/product-sf-b0np1001">NovaPulse</a>
          <a href="/playground/ecommerce/product-sf-b0ow2002#reviews">OrbitFit</a>
          <a href="/playground/static-products">Static</a>
        </body>
      </html>
    `;

    const paths = discoverFollowPaths(
      html,
      "https://scrapifydatalabs.com/playground/ecommerce/",
      "/playground/ecommerce/product-",
      "/playground/ecommerce/",
    );

    expect(paths).toEqual([
      {
        pagePath: "/playground/ecommerce/product-sf-b0np1001",
        kind: "detail",
      },
      {
        pagePath: "/playground/ecommerce/product-sf-b0ow2002",
        kind: "detail",
      },
    ]);
  });

  it("collects Catalog108 category listings and product pages", () => {
    const html = `
      <html>
        <body>
          <a href="/products">All</a>
          <a href="/products?page=1&category=kitchen-mugs">Mugs</a>
          <a href="/products?page=1&category=kitchen-bowls">Bowls</a>
          <a href="/products/1-white-wooden-vase">White Wooden Vase</a>
          <a href="/products?page=2">Next</a>
        </body>
      </html>
    `;

    const paths = discoverFollowPaths(
      html,
      "https://practice.scrapingcentral.com/products",
      {
        followLinkPattern: "/products/",
        followListingPattern: "/products?category=",
        currentPath: "/products",
        allowAllListings: true,
      },
    );

    expect(paths).toEqual([
      {
        pagePath: "/products?category=kitchen-mugs",
        kind: "listing",
      },
      {
        pagePath: "/products?category=kitchen-bowls",
        kind: "listing",
      },
      { pagePath: "/products/1-white-wooden-vase", kind: "detail" },
    ]);
  });

  it("follows same-category pagination but not sibling categories", () => {
    const html = `
      <html>
        <body>
          <a href="/products?page=1&category=kitchen-mugs">Mugs</a>
          <a href="/products?page=1&category=kitchen-bowls">Bowls</a>
          <a href="/products/37-slate-oak-cushion">Slate Oak Cushion</a>
          <a href="/products?page=2&category=kitchen-mugs">Next</a>
        </body>
      </html>
    `;

    const paths = discoverFollowPaths(
      html,
      "https://practice.scrapingcentral.com/products?category=kitchen-mugs",
      {
        followLinkPattern: "/products/",
        followListingPattern: "/products?category=",
        currentPath: "/products?category=kitchen-mugs",
        allowAllListings: false,
      },
    );

    expect(paths).toEqual([
      { pagePath: "/products/37-slate-oak-cushion", kind: "detail" },
      {
        pagePath: "/products?category=kitchen-mugs&page=2",
        kind: "listing",
      },
    ]);
  });
});
