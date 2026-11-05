import { sendFetchHtmlMessage, sendFetchMessage } from "./chrome-message";

declare const __DEV__: boolean;

const CSSTATS_BASE_URL = "https://csstats.gg/player";
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

export interface PlayerStats {
  currentPremierRating: number | null;
  bestPremierRating: number | null;
  kdRatio: number | null;
  hltvRating: number | null;
  hsPercent: number | null;
  matches: number | null;
  winRate: number | null;
  adr: number | null;
  trackingDisabled: boolean;
  trackingInactive: boolean;
}

export type StatsResponse =
  | { ok: true; data: PlayerStats }
  | { ok: false; error: "private" | "not_found" | "fetch_failed" };

interface CacheEntry {
  data: PlayerStats;
  timestamp: number;
}

const storageGet = async (key: string): Promise<unknown> => {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
};

const storageSet = async (key: string, value: unknown): Promise<void> => {
  await chrome.storage.local.set({ [key]: value });
};

const cacheKey = (steamId64: string): string => `csstats_${steamId64}`;

const enforceCacheLimit = async (): Promise<void> => {
  const all = await chrome.storage.local.get(null);

  const csStatsEntries: { key: string; timestamp: number }[] = [];

  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith("csstats_")) continue;

    const entry = value as { timestamp?: number } | undefined;

    csStatsEntries.push({
      key,
      timestamp:
        typeof entry?.timestamp === "number" && Number.isFinite(entry.timestamp)
          ? entry.timestamp
          : 0,
    });
  }

  if (csStatsEntries.length <= MAX_CACHE_ENTRIES) return;

  csStatsEntries.sort((a, b) => a.timestamp - b.timestamp);

  const entriesToRemove = csStatsEntries
    .slice(0, csStatsEntries.length - MAX_CACHE_ENTRIES)
    .map((entry) => entry.key);

  await chrome.storage.local.remove(entriesToRemove);
};

export async function fetchPlayerStats(
  steamId64: string,
): Promise<StatsResponse> {
  if (!__DEV__) {
    const cached = (await storageGet(cacheKey(steamId64))) as CacheEntry | null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { ok: true, data: cached.data };
    }
  }

  const parser = new DOMParser();

  const [profileHtml, statsHtml] = await Promise.all([
    sendFetchMessage(`${CSSTATS_BASE_URL}/${steamId64}`),
    sendFetchHtmlMessage(`${CSSTATS_BASE_URL}/${steamId64}/stats`),
  ]);

  if (!profileHtml) return { ok: false, error: "fetch_failed" };

  const profileDoc = parser.parseFromString(profileHtml, "text/html");

  if (
    profileDoc.querySelector("#outer-wrapper h1")?.textContent?.trim() ===
    "Private Profile"
  ) {
    return { ok: false, error: "private" };
  }

  if (!statsHtml) return { ok: false, error: "fetch_failed" };

  const statsDoc = parser.parseFromString(statsHtml, "text/html");

  const trackingDisabled = [profileHtml, statsHtml].some((html) =>
    html?.toLowerCase().includes("tracking not enabled"),
  );

  const trackingInactive = [profileHtml, statsHtml].some((html) =>
    html?.toLowerCase().includes("tracking inactive"),
  );

  if (!statsDoc.querySelector(".content-sub-nav-outer")) {
    return { ok: false, error: "not_found" };
  }

  const kdRatio =
    parseFloat(
      statsDoc.querySelector("#kpd span")?.textContent?.trim() ?? "",
    ) || null;

  const hltvRating =
    parseFloat(
      statsDoc.querySelector("#rating span")?.textContent?.trim() ?? "",
    ) || null;

  const statPanels = statsDoc.querySelectorAll(".stat-panel");

  let winRate: number | null = null;
  let matches: number | null = null;
  let hsPercent: number | null = null;
  let adr: number | null = null;
  const parsePanelValue = (panel: Element): number | null => {
    const el = panel.querySelector("[style*='font-size:34px']");
    if (!el) return null;
    const text = el.textContent?.trim();
    return text ? parseInt(text, 10) : null;
  };

  statPanels.forEach((panel) => {
    const heading = panel.querySelector(".stat-heading")?.textContent?.trim();
    if (!heading) return;

    if (heading === "Win Rate") {
      winRate = parsePanelValue(panel);
      matches =
        parseInt(
          panel.querySelector(".total-value")?.textContent?.trim() ?? "",
          10,
        ) || null;
    }

    if (heading === "HS%") {
      const el = panel.querySelector("[style*='font-size:34px']");
      if (el) {
        const text = el.textContent?.trim().replace("%", "");
        hsPercent = text ? parseFloat(text) : null;
      }
    }

    if (heading === "ADR") {
      const el = panel.querySelector("[style*='font-size:34px']");
      if (el) {
        const text = el.textContent?.trim();
        adr = text ? parseFloat(text) : null;
      }
    }
  });

  const parseRatingFromDiv = (div: Element | null): number | null => {
    if (!div) return null;
    const span = div.querySelector("span");
    if (!span) return null;
    const main = (span.childNodes[0]?.textContent ?? "").trim();
    if (!main || main === "---") return 0;
    const decimal = (span.querySelector("small")?.textContent ?? "")
      .trim()
      .replace(",", "");
    return parseInt(main + decimal, 10) || null;
  };

  const parseLabelRating = (
    container: Element | Document,
    label: string,
  ): number | null => {
    const kSpan = Array.from(container.querySelectorAll("span.k")).find(
      (el) => (el.textContent ?? "").trim() === label,
    );
    if (!kSpan) return null;
    const vSpan = kSpan.nextElementSibling;
    if (!vSpan?.classList.contains("v")) return null;
    const ratingDiv = vSpan.querySelector("div.cs2rating");
    return parseRatingFromDiv(ratingDiv);
  };

  const pmNow = profileDoc.querySelector(".pm-now");

  const currentPremierRating = pmNow
    ? parseLabelRating(pmNow, "Current")
    : parseLabelRating(profileDoc, "Current");

  const bestCandidates: number[] = [];

  const pmNowBest = pmNow ? parseLabelRating(pmNow, "Best") : null;
  if (pmNowBest != null) bestCandidates.push(pmNowBest);

  profileDoc.querySelectorAll(".rk-row").forEach((row) => {
    const rkVs = row.querySelectorAll(".rk-v");
    if (rkVs.length >= 2) {
      const best = parseRatingFromDiv(rkVs[1].querySelector("div.cs2rating"));
      if (best != null) bestCandidates.push(best);
    }
  });

  const bestPremierRating =
    bestCandidates.length > 0 ? Math.max(...bestCandidates) : null;

  const data: PlayerStats = {
    currentPremierRating,
    bestPremierRating,
    kdRatio,
    hltvRating,
    hsPercent,
    matches,
    winRate,
    adr,
    trackingDisabled,
    trackingInactive,
  };

  if (!__DEV__) {
    await storageSet(cacheKey(steamId64), {
      data,
      timestamp: Date.now(),
    });

    await enforceCacheLimit();
  }

  return { ok: true, data };
}
