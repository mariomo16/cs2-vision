const API_BASE = "https://api.github.com/repos/mariomo16/cs2-vision";

const REQUEST_TIMEOUT_MS = 10_000;

const CACHE_KEY = "cs2_vision_latest_release";
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface ReleaseInfo {
  version: string;
  releaseDate: string;
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
}

interface GitHubCommit {
  sha: string;
}

interface CachedRelease extends ReleaseInfo {
  fetchedAt: number;
  forVersion: string;
}

function isCachedRelease(value: unknown): value is CachedRelease {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.version === "string" &&
    typeof candidate.releaseDate === "string" &&
    (candidate.commitSha === null || typeof candidate.commitSha === "string") &&
    typeof candidate.fetchedAt === "number" &&
    typeof candidate.forVersion === "string"
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
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
  } catch (error) {
    __DEV__ && console.warn("[CS2 Vision] GitHub commit lookup:", error);
    return null;
  }
}

async function readCache(
  extensionVersion: string,
): Promise<ReleaseInfo | null> {
  const stored = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY];

  if (!isCachedRelease(stored)) return null;
  if (stored.forVersion !== extensionVersion) return null;
  if (Date.now() - stored.fetchedAt > CACHE_TTL_MS) return null;

  return {
    version: stored.version,
    releaseDate: stored.releaseDate,
    commitSha: stored.commitSha,
  };
}

async function writeCache(
  extensionVersion: string,
  release: ReleaseInfo,
): Promise<void> {
  const cached: CachedRelease = {
    ...release,
    fetchedAt: Date.now(),
    forVersion: extensionVersion,
  };
  await chrome.storage.local.set({ [CACHE_KEY]: cached });
}

export async function fetchLatestRelease(
  extensionVersion: string,
): Promise<ReleaseInfo> {
  if (!__DEV__) {
    const cached = await readCache(extensionVersion);
    if (cached) return cached;
  }

  const release = await fetchJson<GitHubRelease>("/releases/latest");

  const info: ReleaseInfo = {
    version: release.tag_name.replace(/^v/, ""),
    releaseDate: release.published_at,
    commitSha: await fetchCommitSha(release.tag_name),
  };

  if (!__DEV__) await writeCache(extensionVersion, info);

  return info;
}
