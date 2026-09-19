export interface ShopVisual {
  initial: string;
  color: string;
  text: string;
}

const VISUALS: Record<string, ShopVisual> = {
  "dummy-shop": {
    initial: "S",
    color: "#ff2d78",
    text: "#fff5f8",
  },
  "daily-nonsensia": {
    initial: "D",
    color: "#c2185b",
    text: "#fff0f5",
  },
};

const PALETTE = ["#ff2d78", "#c2185b", "#ff5c96", "#db2777", "#be185d", "#fb7185"];

export function shopVisual(shopId: string, name: string): ShopVisual {
  if (VISUALS[shopId]) return VISUALS[shopId];

  const index = [...shopId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    initial: (name.trim()[0] ?? "?").toUpperCase(),
    color: PALETTE[index % PALETTE.length],
    text: "#ffffff",
  };
}
