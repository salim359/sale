import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import ShopAvatar from "../components/ShopAvatar";
import { useScout } from "../context/ScoutContext";
import { formatDetectedAt } from "../lib/format";
import type { Notification } from "../api/types";
import type { SavedItem } from "../lib/storage";

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { notifications, catalog, markRead } = useScout();

  async function openNotification(item: Notification) {
    if (!item.read) {
      try {
        await markRead(item.notificationId);
      } catch {
        // still open the sale
      }
    }
    navigate("/item", { state: { item: notificationToSaved(item) } });
  }

  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader back />
        <h1 className="h1">Notifications</h1>

        {notifications.length === 0 && (
          <EmptyState title="You’re all caught up">
            <p>Sale alerts from shops you follow will land here.</p>
          </EmptyState>
        )}

        {notifications.map((item) => {
          const shop = catalog.find((entry) => entry.shopId === item.shopId);
          return (
            <button
              key={item.notificationId}
              className={`notice${item.read ? "" : " unread"}`}
              type="button"
              onClick={() => void openNotification(item)}
            >
              <div className="notice-icon">
                {shop ? (
                  <ShopAvatar shopId={shop.shopId} name={shop.name} size={44} />
                ) : (
                  <BrandLogo height={18} />
                )}
              </div>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.shopName}
                  {item.summary ? ` · ${item.summary}` : ""}
                </p>
                {item.discountPercentage != null && (
                  <span className="off">{item.discountPercentage}% OFF</span>
                )}
                <small className="muted">{formatDetectedAt(item.createdAt)}</small>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function notificationToSaved(item: Notification): SavedItem {
  return {
    id: item.notificationId,
    shopId: item.shopId,
    shopName: item.shopName,
    title: item.title,
    summary: item.summary,
    url: item.url,
    discountPercentage: item.discountPercentage,
    detectedAt: item.createdAt,
  };
}
