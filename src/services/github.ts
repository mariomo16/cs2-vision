const API_BASE = "https://api.github.com/repos/mariomo16/cs2-vision";

const REQUEST_TIMEOUT_MS = 10_000;

const CACHE_KEY = "cs2-vision-latest-release";
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseNotesUrl: string;
  commitSha: string | null;
}

export class GitHubRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubRequestError";
  }
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

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new GitHubRequestError(
      response.status,
      `GitHub API responded with ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchCommitSha(tag: string): Promise<string | null> {
  try {
    const commit = await fetchJson<GitHubCommit>(
      `/commits/${encodeURIComponent(tag)}`,
    );
    return commit.sha;
  } catch {
    return null;
  }
}

async function readCache(): Promise<ReleaseInfo | null> {
  const storage = await chrome.storage.local.get(CACHE_KEY);
  const cached = storage[CACHE_KEY] as CachedRelease | undefined;
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;

  return {
    version: cached.version,
    releaseDate: cached.releaseDate,
    releaseNotesUrl: cached.releaseNotesUrl,
    commitSha: cached.commitSha,
  };
}

async function writeCache(release: ReleaseInfo): Promise<void> {
  const cached: CachedRelease = { ...release, fetchedAt: Date.now() };
  await chrome.storage.local.set({ [CACHE_KEY]: cached });
}

export async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const cached = await readCache();
  if (cached) return cached;

  const release = await fetchJson<GitHubRelease>("/releases/latest");

  const info: ReleaseInfo = {
    version: release.tag_name.replace(/^v/, ""),
    releaseDate: release.published_at,
    releaseNotesUrl: release.html_url,
    commitSha: await fetchCommitSha(release.tag_name),
  };

  await writeCache(info);
  return info;
}
