import { describe, expect, it } from "vitest";
import { extractContent } from "./extractContent.js";

describe("extractContent", () => {
  it("extracts sale-related text from HTML", () => {
    const html = `
      <html>
        <head><title>Nike Sale</title></head>
        <body>
          <h1>End of Season Sale</h1>
          <div class="promo-banner">Up to 50% off selected items</div>
          <p>Shop now and save 40% off running shoes.</p>
          <a href="/sale">Shop Sale</a>
        </body>
      </html>
    `;

    const result = extractContent(html, "https://www.nike.com");

    expect(result.title).toBe("Nike Sale");
    expect(result.headings).toContain("End of Season Sale");
    expect(result.promoText.some((t) => t.includes("50%"))).toBe(true);
  });

  it("extracts each discounted product as its own item", () => {
    const html = `
      <html>
        <body>
          <h1>Active deals</h1>
          <ul>
            <li>Black Wooden Cable $50.39 $43.84 −13% Expires 2026-09-20</li>
            <li>Indigo Steel Cushion $60.00 $30.60 −49% Expires 2026-09-20</li>
            <li>Home</li>
          </ul>
        </body>
      </html>
    `;

    const result = extractContent(html, "https://practice.scrapingcentral.com/deals");

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toContain("Black Wooden Cable");
    expect(result.items[1]).toContain("Indigo Steel Cushion");
  });
});
