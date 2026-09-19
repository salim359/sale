import { describe, expect, it } from "vitest";
import {
  computeSaleFingerprint,
  hashContent,
} from "./hashContent.js";
import type { ExtractedContent } from "./types.js";

const sampleContent: ExtractedContent = {
  title: "Nike Sale",
  headings: ["End of Season Sale"],
  promoText: ["Up to 50% off"],
  prices: ["50% off"],
  links: ["https://www.nike.com/sale"],
  items: [],
  rawTextSample: "End of season sale up to 50% off",
};

describe("hashContent", () => {
  it("returns stable hash for same content", () => {
    const hash1 = hashContent(sampleContent);
    const hash2 = hashContent({ ...sampleContent });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("returns different hash when content changes", () => {
    const hash1 = hashContent(sampleContent);
    const hash2 = hashContent({
      ...sampleContent,
      promoText: ["Up to 60% off"],
    });
    expect(hash1).not.toBe(hash2);
  });
});

describe("computeSaleFingerprint", () => {
  it("returns stable fingerprint for same sale", () => {
    const fp1 = computeSaleFingerprint({
      shopId: "nike",
      title: "End of Season Sale",
      discountValue: "50",
      url: "https://www.nike.com/sale",
    });
    const fp2 = computeSaleFingerprint({
      shopId: "nike",
      title: "End of Season Sale",
      discountValue: "50",
      url: "https://www.nike.com/sale/",
    });
    expect(fp1).toBe(fp2);
  });
});
