import { useEffect, useMemo, useState } from "react";
import type { Shop } from "../api/types";
import { loadShopCategories } from "./productPage";

export function useShopCategories(shops: Shop[]) {
  const [byShop, setByShop] = useState<Record<string, string[]>>({});
  const shopKey = shops.map((shop) => shop.shopId).join(",");

  useEffect(() => {
    if (shops.length === 0) {
      setByShop({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      shops.map(async (shop) => [shop.shopId, await loadShopCategories(shop)] as const),
    ).then((entries) => {
      if (!cancelled) setByShop(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [shopKey]);

  const all = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const list of Object.values(byShop)) {
      for (const label of list) {
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        labels.push(label);
      }
    }
    return labels;
  }, [byShop]);

  return { byShop, all };
}
