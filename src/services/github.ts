import { sendFetchMessage } from "./chrome-message";

const API_BASE = "https://api.github.com/repos/mariomo16/cs2-vision";

const CACHE_KEY = "cs2-vision-latest-release";
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseNotesUrl: string;
  commitSha: string | null;
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  html_url: string;
}

interface GitHubCommit {
  sha: string;
}

interface CachedRelease extends ReleaseInfo {
  fetchedAt: number;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const body = await sendFetchMessage(`${API_BASE}${path}`);
  if (!body) return null;

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

async function fetchCommitSha(tag: string): Promise<string | null> {
  const commit = await fetchJson<GitHubCommit>(
    `/commits/${encodeURIComponent(tag)}`,
  );
  return commit?.sha ?? null;
}

async function fetchRelease(path: string): Promise<ReleaseInfo | null> {
  const release = await fetchJson<GitHubRelease>(path);
  if (!release) return null;

  return {
    version: release.tag_name.replace(/^v/, ""),
    releaseDate: release.published_at,
    releaseNotesUrl: release.html_url,
    commitSha: await fetchCommitSha(release.tag_name),
  };
}

async function readCache(): Promise<CachedRelease | null> {
  const data = await chrome.storage.local.get(CACHE_KEY);
  const cached = data[CACHE_KEY] as CachedRelease | undefined;
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached;
}

async function writeCache(release: ReleaseInfo): Promise<void> {
  const cached: CachedRelease = { ...release, fetchedAt: Date.now() };
  await chrome.storage.local.set({ [CACHE_KEY]: cached });
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const cached = await readCache();
  if (cached) return cached;

  const release = await fetchRelease("/releases/latest");
  if (release) await writeCache(release);
  return release;
}
