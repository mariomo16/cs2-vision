import {
  BLOCK_KEYS,
  type BlockKey,
  type BlockSettings,
  readBlockSettings,
  writeBlockSettings,
} from "../services/settings";

const COMMIT_DISPLAY_LENGTH = 7;

function getBuildCommit(): string | null {
  if (typeof __BUILD_COMMIT__ !== "string") return null;

  return __BUILD_COMMIT__.trim() || null;
}

function getBuildDate(): string | null {
  if (typeof __BUILD_DATE__ !== "string") return null;

  return __BUILD_DATE__.trim() || null;
}

function formatVersion(version: string, commitSha: string | null): string {
  if (!commitSha) return version;

  return `${version} (${commitSha.slice(0, COMMIT_DISPLAY_LENGTH)})`;
}

function formatDate(isoDate: string): string {
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

function getBlockKey(button: HTMLButtonElement): BlockKey | null {
  const key = button.dataset.block;

  if (key === "csstats" || key === "faceit" || key === "leetify") return key;

  return null;
}

function applyBlockSettings(settings: BlockSettings): void {
  for (const key of BLOCK_KEYS) {
    const button = document.querySelector<HTMLButtonElement>(
      `[data-block="${key}"]`,
    );
    if (button) button.setAttribute("aria-pressed", String(settings[key]));
  }
}

async function init(): Promise<void> {
  const version = chrome.runtime.getManifest().version;
  const buildDate = getBuildDate();

  setText(
    "current-version",
    `Current Version: ${formatVersion(version, getBuildCommit())}`,
  );
  setText(
    "release-date",
    buildDate
      ? `Released ${formatDate(buildDate)}`
      : "Released date unavailable",
  );

  let settings = await readBlockSettings();
  applyBlockSettings(settings);

  document
    .querySelectorAll<HTMLButtonElement>("[data-block]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const key = getBlockKey(button);
        if (!key) return;

        settings = { ...settings, [key]: !settings[key] };
        applyBlockSettings(settings);
        void writeBlockSettings(settings).catch(() => {});
      });
    });
}

void init();
