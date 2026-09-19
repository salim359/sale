import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { IconHeart } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import ShopAvatar from "../components/ShopAvatar";
import { featuredItems, useScout } from "../context/ScoutContext";
import { formatDetectedAt } from "../lib/format";
import { loadShopCategories } from "../lib/productPage";

export default function ShopScreen() {
  const { shopId = "" } = useParams();
  const navigate = useNavigate();
  const { catalog, selected, follow, unfollow, sales, isSaved, toggleSaved } = useScout();
  const [tab, setTab] = useState<"sales" | "categories">("sales");
  const [busy, setBusy] = useState(false);

  const shop = catalog.find((item) => item.shopId === shopId)
    ?? selected.find((item) => item.shopId === shopId);
  const following = Boolean(shop?.selected || selected.some((item) => item.shopId === shopId));
  const [categories, setCategories] = useState<string[]>([]);
  const items = useMemo(
    () => featuredItems(sales.filter((sale) => sale.shopId === shopId)),
    [sales, shopId],
  );
  const feature = items[0];
  const moreDeals = items.slice(1);

  useEffect(() => {
    if (!shop) {
      setCategories([]);
      return;
    }
    let cancelled = false;
    void loadShopCategories(shop).then((list) => {
      if (!cancelled) setCategories(list);
    });
    return () => {
      cancelled = true;
    };
  }, [shop?.shopId, shop?.website]);

  if (!shop) {
    return (
      <div className="screen">
        <div className="scroll">
          <PageHeader back />
          <EmptyState title="Shop not found">
            <p>This shop is not in the current catalog.</p>
          </EmptyState>
        </div>
      </div>
    );
  }

  const currentShop = shop;

  async function toggleFollow() {
    setBusy(true);
    try {
      if (following) await unfollow(currentShop.shopId);
      else await follow(currentShop.shopId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader
          back
          right={
            <button
              className={`icon-btn plain${feature && isSaved(feature.id) ? " loved" : ""}`}
              onClick={() => feature && toggleSaved(feature)}
              aria-label="Save shop sale"
            >
              <IconHeart filled={Boolean(feature && isSaved(feature.id))} />
            </button>
          }
        />

        <div className="shop-sheet shop-sheet-flat">
          <div className="shop-title-row">
            <ShopAvatar shopId={shop.shopId} name={shop.name} size={48} />
            <h1>{shop.name}</h1>
            <button
              className={`btn-follow${following ? " outline" : ""}`}
              disabled={busy}
              onClick={() => void toggleFollow()}
            >
              {following ? "Following" : "Follow"}
            </button>
          </div>

          {categories.length > 0 && (
            <div className="chips shop-chip-preview">
              {categories.slice(0, 4).map((item) => (
                <span key={item} className="chip">{item}</span>
              ))}
              {categories.length > 4 && (
                <button
                  className="chip"
                  type="button"
                  onClick={() => setTab("categories")}
                >
                  +{categories.length - 4}
                </button>
              )}
            </div>
          )}

          <div className="tabs">
            <button className={tab === "sales" ? "on" : ""} onClick={() => setTab("sales")}>
              Latest Sales
            </button>
            <button className={tab === "categories" ? "on" : ""} onClick={() => setTab("categories")}>
              Categories
            </button>
          </div>

          {tab === "sales" && feature && (
            <>
              <button className="sale-banner" onClick={() => navigate("/item", { state: { item: feature } })}>
                {feature.image ? <img src={feature.image} alt="" /> : null}
                <div className="body">
                  <strong>
                    {feature.discountPercentage != null
                      ? `Up to ${feature.discountPercentage}% Off`
                      : feature.title}
                  </strong>
                  <p className="muted">{feature.summary}</p>
                  <span className="muted">View sale →</span>
                </div>
              </button>
              {moreDeals.length > 0 && (
                <>
                  <h2 className="h2 section-title">Recent deals</h2>
                  <div className="deal-list">
                    {moreDeals.map((item) => (
                      <button
                        key={item.id}
                        className={`deal-row${item.image ? "" : " no-media"}`}
                        onClick={() => navigate("/item", { state: { item } })}
                      >
                        {item.image ? <img src={item.image} alt="" /> : null}
                        <div className="deal-row-copy">
                          <strong>{item.title}</strong>
                          {item.summary ? <p>{item.summary}</p> : null}
                          <div className="deal-row-meta">
                            {item.discountPercentage != null && (
                              <span className="off">{item.discountPercentage}% OFF</span>
                            )}
                            <small>{formatDetectedAt(item.detectedAt)}</small>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === "sales" && !feature && (
            <EmptyState title="No sales yet">
              <p>sale is watching this shop. New drops will show up here.</p>
            </EmptyState>
          )}

          {tab === "categories" && (
            categories.length ? (
              <ul className="category-list">
                {categories.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No categories found">
                <p>sale did not find category links on this shop yet.</p>
              </EmptyState>
            )
          )}
        </div>
      </div>
    </div>
  );
}
