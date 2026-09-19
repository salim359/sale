import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { IconHeart } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { useScout } from "../context/ScoutContext";
import { formatDetectedAt } from "../lib/format";

export default function SavedScreen() {
  const navigate = useNavigate();
  const { saved, toggleSaved } = useScout();
  const [tab, setTab] = useState<"items" | "drops">("items");
  const drops = saved.filter((item) => (item.discountPercentage ?? 0) >= 30);
  const list = tab === "items" ? saved : drops;

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader />
        <h1 className="h1">Saved</h1>
        <div className="chips">
          <button className={`chip${tab === "items" ? " on" : ""}`} onClick={() => setTab("items")}>
            Saved Items
          </button>
          <button className={`chip${tab === "drops" ? " on" : ""}`} onClick={() => setTab("drops")}>
            Price Drops
          </button>
        </div>

        {list.length === 0 && (
          <EmptyState title={tab === "items" ? "Nothing saved yet" : "No price drops"}>
            <p>
              {tab === "items"
                ? "Tap the heart on a deal to keep it here."
                : "Drops from your saved pieces will show up here."}
            </p>
          </EmptyState>
        )}

        <div className="saved-list">
          {list.map((item) => {
            const hasPrice = item.price != null || item.was != null || item.discountPercentage != null;
            return (
              <div key={item.id} className={`saved-card${item.image ? "" : " no-media"}`}>
                <button
                  className="saved-card-hit"
                  type="button"
                  onClick={() => navigate("/item", { state: { item } })}
                >
                  {item.image ? <img src={item.image} alt="" /> : null}
                  <div className="saved-copy">
                    <small>{item.shopName}</small>
                    <strong>{item.title}</strong>
                    {item.summary ? <p>{item.summary}</p> : null}
                    {hasPrice && (
                      <div className="saved-card-meta">
                        {item.price != null && <span className="price price-sm">${item.price}</span>}
                        {item.was != null && <span className="was">${item.was}</span>}
                        {item.discountPercentage != null && (
                          <span className="off">{item.discountPercentage}% OFF</span>
                        )}
                      </div>
                    )}
                    <small className="saved-time">{formatDetectedAt(item.detectedAt)}</small>
                  </div>
                </button>
                <button
                  className="heart"
                  type="button"
                  onClick={() => toggleSaved(item)}
                  aria-label="Unsave"
                >
                  <IconHeart filled />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
