import { describe, expect, it } from "vitest";
import { mightContainSale } from "./keywordFilter.js";
import type { ExtractedContent } from "./types.js";

describe("mightContainSale", () => {
  it("returns true for promotional content", () => {
    const content: ExtractedContent = {
      title: "Zara",
      headings: ["Special Prices"],
      promoText: ["Up to 40% off selected styles"],
      prices: ["40% off"],
      links: [],
      items: [],
      rawTextSample: "Limited time sale on selected items",
    };

    expect(mightContainSale(content)).toBe(true);
  });

  it("returns false for generic content", () => {
    const content: ExtractedContent = {
      title: "About Us",
      headings: ["Our Story"],
      promoText: [],
      prices: [],
      links: [],
      items: [],
      rawTextSample: "We are a fashion brand founded in 1975.",
    };

    expect(mightContainSale(content)).toBe(false);
  });
});
