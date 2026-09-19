export const MAX_SALES_PER_SHOP = 10;

export function remainingShopSaleSlots(
  existingCount: number,
  max = MAX_SALES_PER_SHOP,
): number {
  return Math.max(0, max - existingCount);
}
