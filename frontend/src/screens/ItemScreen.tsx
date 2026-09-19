import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { IconBack, IconExternal, IconHeart, IconShare, IconStar } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { useScout } from "../context/ScoutContext";
import { loadProductDetails, type ProductDetails } from "../lib/productPage";
import type { SavedItem } from "../lib/storage";

export default function ItemScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const item = (state as { item?: SavedItem } | null)?.item;
  const { isSaved, toggleSaved, catalog } = useScout();
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

  const shop = catalog.find((entry) => entry.shopId === item?.shopId);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setDetailsStatus("loading");
    void loadProductDetails(item.title, item.url, shop)
      .then((result) => {
        if (cancelled) return;
        setDetails(result);
        setDetailsStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setDetails(null);
        setDetailsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [item, shop]);

  if (!item) {
    return (
      <div className="screen">
        <div className="scroll">
          <PageHeader back />
          <EmptyState title="Item not found">
            <button className="btn btn-primary" onClick={() => navigate("/")}>Back home</button>
          </EmptyState>
        </div>
      </div>
    );
  }

  const saved = isSaved(item.id);
  const image = item.image ?? details?.images[0];
  const price =
    item.price ??
    details?.price ??
    (item.was != null && item.discountPercentage != null
      ? Math.round(item.was * (1 - item.discountPercentage / 100))
      : null);
  const was = item.was ?? details?.was;
  const description = details?.description || (!details?.bullets.length ? item.summary : undefined);
  const productUrl = details?.url ?? item.url;

  const actions = (
    <div className="hero-actions-right">
      <button
        className={`icon-btn${image ? "" : " plain"}${saved ? " loved" : ""}`}
        onClick={() => toggleSaved(item)}
        aria-label="Save"
      >
        <IconHeart filled={saved} />
      </button>
      <button
        className={`icon-btn${image ? "" : " plain"}`}
        onClick={() => void navigator.clipboard?.writeText(productUrl)}
        aria-label="Share"
      >
        <IconShare />
      </button>
    </div>
  );

  return (
    <div className="screen">
      <div className={`scroll${image ? " tight" : ""}`}>
        {image ? (
          <div className="hero-photo hero-tall">
            <img src={image} alt="" />
            <div className="hero-actions">
              <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
                <IconBack />
              </button>
              {actions}
            </div>
          </div>
        ) : (
          <PageHeader back right={actions} />
        )}

        <div className={`shop-sheet${image ? "" : " shop-sheet-flat"}`}>
          <h1 className="h1">{item.title}</h1>
          <p className="muted item-shop">{item.shopName}</p>
          {details?.categories.length ? (
            <div className="chips item-chips">
              {details.categories.map((category) => (
                <span key={category} className="chip">{category}</span>
              ))}
            </div>
          ) : null}
          {details?.averageRating != null && (
            <div className="item-rating">
              <IconStar />
              <strong>{details.averageRating}</strong>
              {details.reviewCount != null && (
                <span className="muted">({details.reviewCount} reviews)</span>
              )}
            </div>
          )}
          <div className="price-row">
            {price != null && <span className="price">${formatMoney(price)}</span>}
            {was != null && <span className="was">${formatMoney(was)}</span>}
            {item.discountPercentage != null && (
              <span className="off">{item.discountPercentage}% OFF</span>
            )}
          </div>

          {detailsStatus === "loading" && <div className="skeleton" />}

          {(description || details?.bullets.length) ? (
            <section className="item-block">
              <h2 className="h2">Description</h2>
              {description ? <p>{description}</p> : null}
              {details?.bullets.length ? (
                <ul className="item-bullets">
                  {details.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {details?.specs.length ? (
            <section className="item-block">
              <h2 className="h2">Specifications</h2>
              <dl className="item-specs">
                {details.specs.map((spec) => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="item-block">
            <h2 className="h2">Reviews</h2>
            {detailsStatus === "loading" ? (
              <p>Loading reviews from the product page…</p>
            ) : details?.reviews.length ? (
              <ul className="review-list">
                {details.reviews.map((review, index) => (
                  <li key={`${review.author}-${index}`} className="review-card">
                    <div className="review-card-head">
                      <strong>{review.author}</strong>
                      {review.rating != null && (
                        <span className="review-stars">
                          <IconStar /> {review.rating}
                        </span>
                      )}
                      {review.date ? <small className="muted">{review.date}</small> : null}
                    </div>
                    {review.title ? <p className="review-title">{review.title}</p> : null}
                    <p>{review.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No reviews were found on this product page.</p>
            )}
          </section>
        </div>
      </div>
      <div className="sticky-buy">
        <a className="btn btn-primary" href={productUrl} target="_blank" rel="noreferrer">
          View on website <IconExternal />
        </a>
      </div>
    </div>
  );
}

function formatMoney(value: number): string {
  return value % 1 ? value.toFixed(2) : String(value);
}
