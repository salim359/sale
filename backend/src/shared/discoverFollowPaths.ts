import * as cheerio from "cheerio";

const MAX_FOLLOW_LINKS = 10;

export type FollowKind = "listing" | "detail";

export interface DiscoveredPath {
  pagePath: string;
  kind: FollowKind;
}

export interface DiscoverFollowOptions {
  followLinkPattern?: string;
  followListingPattern?: string;
  currentPath?: string;
  allowAllListings?: boolean;
}

export function discoverFollowPaths(
  html: string,
  pageUrl: string,
  followLinkPatternOrOptions: string | DiscoverFollowOptions,
  currentPath?: string,
): DiscoveredPath[] {
  const options = normalizeOptions(followLinkPatternOrOptions, currentPath);
  const origin = new URL(pageUrl).origin;
  const listing = parseListingPattern(options.followListingPattern);
  const current = canonicalizeCurrentPath(
    options.currentPath ?? "",
    pageUrl,
    listing,
  );
  const currentListingValue = listing
    ? searchParam(current, listing.param)
    : undefined;
  const paths = new Map<string, FollowKind>();
  const $ = cheerio.load(html);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const url = new URL(href, pageUrl);
      if (url.origin !== origin) return;

      const discovered = classifyFollowUrl(url, options.followLinkPattern, listing);
      if (!discovered) return;
      if (discovered.pagePath === current) return;

      if (discovered.kind === "listing") {
        if (!options.allowAllListings) {
          if (!currentListingValue) return;
          if (searchParam(discovered.pagePath, listing!.param) !== currentListingValue) {
            return;
          }
        }
      }

      const existing = paths.get(discovered.pagePath);
      if (!existing) {
        paths.set(discovered.pagePath, discovered.kind);
      }
    } catch {
      // ignore invalid hrefs
    }
  });

  return [...paths.entries()]
    .slice(0, MAX_FOLLOW_LINKS)
    .map(([pagePath, kind]) => ({ pagePath, kind }));
}

export function isFollowTarget(
  pathname: string,
  followLinkPattern: string,
): boolean {
  const prefix = normalizePrefix(followLinkPattern);
  const path = normalizePath(pathname.split("?")[0] ?? pathname);
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return rest.length > 0;
}

function classifyFollowUrl(
  url: URL,
  followLinkPattern: string | undefined,
  listing: ListingPattern | undefined,
): DiscoveredPath | undefined {
  if (listing && isListingUrl(url, listing)) {
    return { pagePath: listingPagePath(url, listing), kind: "listing" };
  }

  if (followLinkPattern && isFollowTarget(url.pathname, followLinkPattern)) {
    return { pagePath: normalizePath(url.pathname), kind: "detail" };
  }

  return undefined;
}

interface ListingPattern {
  pathname: string;
  param: string;
}

function parseListingPattern(
  followListingPattern: string | undefined,
): ListingPattern | undefined {
  if (!followListingPattern || !followListingPattern.includes("?")) return undefined;
  const [pathname, query] = followListingPattern.split("?", 2);
  const param = (query ?? "").replace(/=$/, "");
  if (!pathname || !param) return undefined;
  return { pathname: normalizePath(pathname), param };
}

function isListingUrl(url: URL, listing: ListingPattern): boolean {
  if (normalizePath(url.pathname) !== listing.pathname) return false;
  const value = url.searchParams.get(listing.param)?.trim();
  return Boolean(value);
}

function listingPagePath(url: URL, listing: ListingPattern): string {
  const value = url.searchParams.get(listing.param)?.trim() ?? "";
  const page = url.searchParams.get("page")?.trim();
  const qs = new URLSearchParams();
  qs.set(listing.param, value);
  if (page && page !== "1") qs.set("page", page);
  return `${listing.pathname}?${qs.toString()}`;
}

function normalizeOptions(
  followLinkPatternOrOptions: string | DiscoverFollowOptions,
  currentPath?: string,
): DiscoverFollowOptions {
  if (typeof followLinkPatternOrOptions === "string") {
    return {
      followLinkPattern: followLinkPatternOrOptions,
      currentPath,
      allowAllListings: true,
    };
  }
  return {
    allowAllListings: true,
    ...followLinkPatternOrOptions,
  };
}

function canonicalizeCurrentPath(
  pagePath: string,
  pageUrl: string,
  listing: ListingPattern | undefined,
): string {
  try {
    const url = new URL(pagePath || "/", pageUrl);
    if (listing && isListingUrl(url, listing)) {
      return listingPagePath(url, listing);
    }
    const search = url.searchParams.toString();
    return search
      ? `${normalizePath(url.pathname)}?${search}`
      : normalizePath(url.pathname);
  } catch {
    return normalizePath(pagePath.split("?")[0] ?? pagePath);
  }
}

function searchParam(pagePath: string, param: string): string | undefined {
  const query = pagePath.includes("?") ? pagePath.slice(pagePath.indexOf("?")) : "";
  if (!query) return undefined;
  return new URLSearchParams(query).get(param)?.trim() || undefined;
}

function normalizePrefix(pattern: string): string {
  return pattern.startsWith("/") ? pattern : `/${pattern}`;
}

function normalizePath(pathname: string): string {
  if (!pathname) return "";
  return pathname.replace(/\/$/, "") || "/";
}
