import { fetchLatestRelease, GitHubRequestError } from "../services/github";

const COMMIT_DISPLAY_LENGTH = 7;

function getBuildCommit(): string | null {
  if (typeof __BUILD_COMMIT__ !== "string") return null;

  return __BUILD_COMMIT__.trim() || null;
}

function formatVersion(version: string, commitSha: string | null): string {
  if (!commitSha) return version;

  return `${version} (${commitSha.slice(0, COMMIT_DISPLAY_LENGTH)})`;
}

function formatReleaseDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function getUpdateErrorMessage(error: unknown): string {
  if (error instanceof GitHubRequestError && error.status === 403) {
    return "Rate limit reached, try again later";
  }

  return "Couldn't check for updates";
}

async function init(): Promise<void> {
  const version = chrome.runtime.getManifest().version;

  setText(
    "current-version",
    `Current Version: ${formatVersion(version, getBuildCommit())}`,
  );

  try {
    const release = await fetchLatestRelease(version);

    setText(
      "latest-version",
      `Latest Version: ${formatVersion(release.version, release.commitSha)}`,
    );
    setText(
      "release-date",
      `Released ${formatReleaseDate(release.releaseDate)}`,
    );
  } catch (error) {
    setText("latest-version", "Latest Version: Unavailable");
    setText("release-date", getUpdateErrorMessage(error));
  }
}

void init();
