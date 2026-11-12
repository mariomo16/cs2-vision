import { fetchLatestRelease, GitHubRequestError } from "../services/github";

const POPUP_TITLE = "CS2 Vision";
const ICON_PATH = "assets/icons/icon512.png";

interface PopupElements {
  currentVersion: HTMLElement;
  latestVersion: HTMLElement;
  releaseDate: HTMLElement;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getBuildCommit(): string | null {
  if (typeof __BUILD_COMMIT__ !== "string") return null;
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

function buildPopup(root: HTMLElement): PopupElements {
  const icon = createElement("img", "csl-popup-icon");
  icon.src = chrome.runtime.getURL(ICON_PATH);
  icon.alt = "";

  const title = createElement("h1", "csl-popup-title", POPUP_TITLE);

  const currentVersion = createElement("span", "csl-popup-value");
  const latestVersion = createElement("span", "csl-popup-value");
  const releaseDate = createElement("p", "csl-popup-line");

  const currentLine = createElement("p", "csl-popup-line");
  currentLine.append(
    createElement("span", "csl-popup-label", "Current Version:"),
    " ",
    currentVersion,
  );

  const latestLine = createElement("p", "csl-popup-line");
  latestLine.append(
    createElement("span", "csl-popup-label", "Latest Version:"),
    " ",
    latestVersion,
  );

  const info = createElement("div", "csl-popup-info");
  info.append(title, currentLine, latestLine, releaseDate);

  const body = createElement("div", "csl-popup-body");
  body.append(icon, info);

  root.append(body);

  return { currentVersion, latestVersion, releaseDate };
}

function setMuted(element: HTMLElement, text: string): void {
  element.textContent = text;
  element.classList.add("csl-popup-value--muted");
}

async function init(): Promise<void> {
  const root = document.getElementById("csl-popup");
  if (!root) return;

  const elements = buildPopup(root);

  elements.currentVersion.textContent = formatVersion(
    chrome.runtime.getManifest().version,
    getBuildCommit(),
  );
  setMuted(elements.latestVersion, "Loading…");
  setMuted(elements.releaseDate, "Checking for updates…");

  try {
    const release = await fetchLatestRelease();

    elements.latestVersion.textContent = formatVersion(
      release.version,
      release.commitSha,
    );
    elements.releaseDate.textContent = `Released ${formatReleaseDate(release.releaseDate)}`;
  } catch (error) {
    setMuted(elements.latestVersion, "Unavailable");
    setMuted(
      elements.releaseDate,
      error instanceof GitHubRequestError && error.status === 403
        ? "Rate limit reached, try again later"
        : "Couldn't check for updates",
    );
  }
}

void init();
