export async function fetchShopHtml(url: string): Promise<string> {
  const candidates = import.meta.env.DEV
    ? [`/__shop?url=${encodeURIComponent(url)}`, url]
    : [url, `/__shop?url=${encodeURIComponent(url)}`];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { headers: { Accept: "text/html" } });
      if (!response.ok) continue;
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not load product page");
}
