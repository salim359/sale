import { shopVisual } from "../lib/shopVisuals";

export default function ShopAvatar({
  shopId,
  name,
  size = 52,
}: {
  shopId: string;
  name: string;
  size?: number;
}) {
  const visual = shopVisual(shopId, name);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: visual.color,
        color: visual.text,
        fontSize: size * 0.36,
      }}
    >
      {visual.initial}
    </span>
  );
}
