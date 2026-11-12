import { fetchLatestRelease } from "../services/github";

declare const __BUILD_COMMIT__: string;

function getCurrentVersion(): string {
  return chrome.runtime.getManifest().version;
}

function getBuildCommit(): string | null {
  if (typeof __BUILD_COMMIT__ === "undefined") return null;
  return __BUILD_COMMIT__ || null;
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

function formatVersion(version: string, commitSha: string | null): string {
  if (!commitSha) return version;
  return `${version} (${commitSha.slice(0, 7)})`;
}

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

async function init(): Promise<void> {
  setText(
    "csl-current-version",
    formatVersion(getCurrentVersion(), getBuildCommit()),
  );

  const latest = await fetchLatestRelease();

  if (!latest) {
    setText("csl-latest-version", "Unavailable");
    setText("csl-release-date", "Couldn't check for updates");
    return;
  }

  setText(
    "csl-latest-version",
    formatVersion(latest.version, latest.commitSha),
  );
  setText(
    "csl-release-date",
    `Released ${formatReleaseDate(latest.releaseDate)}`,
  );
}

void init();
