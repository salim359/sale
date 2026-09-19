import { describe, expect, it } from "vitest";
import { MAX_SALES_PER_SHOP, remainingShopSaleSlots } from "./limits.js";

describe("shop sale write limit", () => {
  it("caps remaining slots at 10 per shop", () => {
    expect(MAX_SALES_PER_SHOP).toBe(10);
    expect(remainingShopSaleSlots(0)).toBe(10);
    expect(remainingShopSaleSlots(7)).toBe(3);
    expect(remainingShopSaleSlots(10)).toBe(0);
    expect(remainingShopSaleSlots(25)).toBe(0);
  });
});
