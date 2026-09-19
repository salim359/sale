import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { IconCheck, IconPlus, IconSearch } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import ShopAvatar from "../components/ShopAvatar";
import { useScout } from "../context/ScoutContext";
import { useShopCategories } from "../lib/useShopCategories";

export default function SearchScreen() {
  const navigate = useNavigate();
  const { catalog, follow, unfollow } = useScout();
  const { byShop, all: scrapedCategories } = useShopCategories(catalog);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const filters = useMemo(() => ["All", ...scrapedCategories], [scrapedCategories]);

  const shops = useMemo(() => {
    const needle = query.toLowerCase();
    return catalog.filter((shop) => {
      const matchesQuery = shop.name.toLowerCase().includes(needle);
      if (!matchesQuery) return false;
      if (category === "All") return true;
      return (byShop[shop.shopId] ?? []).some(
        (label) => label.toLowerCase() === category.toLowerCase(),
      );
    });
  }, [catalog, query, category, byShop]);

  async function toggle(shopId: string, selected?: boolean) {
    setBusyId(shopId);
    try {
      if (selected) await unfollow(shopId);
      else await follow(shopId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader />
        <h1 className="h1">Search</h1>
        <p className="subtitle">Find shops in the catalog and follow the ones you want watched.</p>
        <div className="search">
          <IconSearch size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shops"
          />
        </div>
        {filters.length > 1 && (
          <div className="chips">
            {filters.map((item) => (
              <button
                key={item}
                className={`chip${category === item ? " on" : ""}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {shops.map((shop) => (
          <div key={shop.shopId} className="shop-row">
            <button
              className="hit-row"
              type="button"
              onClick={() => navigate(`/shop/${shop.shopId}`)}
            >
              <ShopAvatar shopId={shop.shopId} name={shop.name} />
              <strong>{shop.name}</strong>
            </button>
            <button
              className={`round-action${shop.selected ? " on" : ""}`}
              disabled={busyId === shop.shopId}
              onClick={() => void toggle(shop.shopId, shop.selected)}
            >
              {shop.selected ? <IconCheck /> : <IconPlus />}
            </button>
          </div>
        ))}

        {shops.length === 0 && (
          <EmptyState title="No matching shops">
            <p>The live catalog is still small. Try All, or another scraped category.</p>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
