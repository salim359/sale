import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { IconBell, IconPlus } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import ShopAvatar from "../components/ShopAvatar";
import { featuredItems, useScout } from "../context/ScoutContext";
import { formatDetectedAt } from "../lib/format";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { selected, sales, loading, error, refresh, unreadCount } = useScout();
  const items = featuredItems(sales);
  const feature = items[0];
  const updates = items.slice(feature ? 1 : 0);
  const shops = selected;

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader
          right={
            <button
              className="icon-btn plain bell-wrap"
              type="button"
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
            >
              <IconBell />
              {unreadCount > 0 && <span className="badge-dot" />}
            </button>
          }
        />

        <div className="brand-row">
          {shops.map((shop) => (
            <button
              key={shop.shopId}
              className="hit"
              type="button"
              onClick={() => navigate(`/shop/${shop.shopId}`)}
            >
              <ShopAvatar shopId={shop.shopId} name={shop.name} />
            </button>
          ))}
          <button className="brand-add" type="button" onClick={() => navigate("/search")} aria-label="Add shop">
            <IconPlus />
          </button>
        </div>

        {error && (
          <EmptyState title="Couldn’t load sales">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => void refresh()}>
              Try again
            </button>
          </EmptyState>
        )}

        {loading && <div className="skeleton" />}

        {feature && (
          <button
            className={`feature-card${feature.image ? "" : " no-media"}`}
            onClick={() => navigate("/item", { state: { item: feature } })}
          >
            <div className="feature-copy">
              <div className="eyebrow">New Sale Alert!</div>
              <h3>{feature.shopName}</h3>
              <p>
                {feature.discountPercentage != null
                  ? `Up to ${feature.discountPercentage}% off`
                  : feature.summary}
              </p>
              <span className="muted">View deals →</span>
            </div>
            {feature.image ? <img src={feature.image} alt="" /> : null}
          </button>
        )}

        <div className="section-head">
          <h2 className="h2">Latest updates</h2>
          <button className="see-all" onClick={() => navigate("/search")}>
            See all
          </button>
        </div>

        {!loading && updates.length === 0 && !feature && (
          <EmptyState title="No sales yet today">
            <p>Follow shops and sale will fill this feed when pages change.</p>
          </EmptyState>
        )}

        {updates.map((item) => (
          <button
            key={item.id}
            className={`update-row${item.image ? "" : " no-media"}`}
            onClick={() => navigate("/item", { state: { item } })}
          >
            {item.image ? <img src={item.image} alt="" /> : null}
            <div className="update-copy">
              <small>{item.shopName}</small>
              <strong>
                {item.discountPercentage != null
                  ? `Up to ${item.discountPercentage}% off`
                  : item.title}
              </strong>
              <small>{formatDetectedAt(item.detectedAt)}</small>
            </div>
            <ShopAvatar shopId={item.shopId} name={item.shopName} size={28} />
          </button>
        ))}
      </div>
    </div>
  );
}
