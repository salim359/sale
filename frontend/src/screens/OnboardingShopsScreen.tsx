import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { IconCheck, IconPlus, IconSearch } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import ShopAvatar from "../components/ShopAvatar";
import { useScout } from "../context/ScoutContext";
import { useShopCategories } from "../lib/useShopCategories";

export default function OnboardingShopsScreen() {
  const navigate = useNavigate();
  const { catalog, follow, unfollow, completeOnboarding, loading, profile } = useScout();
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

  const selectedCount = catalog.filter((shop) => shop.selected).length;

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
        <PageHeader back />
        <h1 className="h1">Add your favourite shops</h1>
        <p className="subtitle">We’ll watch their pages and alert you when a sale appears.</p>

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

        {loading && <div className="skeleton" />}

        {shops.map((shop) => (
          <div key={shop.shopId} className="shop-row">
            <ShopAvatar shopId={shop.shopId} name={shop.name} />
            <strong>{shop.name}</strong>
            <button
              className={`round-action${shop.selected ? " on" : ""}`}
              disabled={busyId === shop.shopId}
              onClick={() => void toggle(shop.shopId, shop.selected)}
              aria-label={shop.selected ? `Remove ${shop.name}` : `Add ${shop.name}`}
            >
              {shop.selected ? <IconCheck /> : <IconPlus />}
            </button>
          </div>
        ))}

        {!loading && shops.length === 0 && (
          <EmptyState title="No shops in this filter">
            <p>Try All, or another category scraped from the shops.</p>
          </EmptyState>
        )}
      </div>
      <div className="footer-cta">
        <button
          className="btn btn-primary"
          disabled={selectedCount === 0 || !profile}
          onClick={() => {
            completeOnboarding();
            navigate("/");
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
