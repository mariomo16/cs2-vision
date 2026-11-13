import { readdir } from "node:fs/promises";
import path from "node:path";

/** Repository root, resolved from this file's location. */
export const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");

export const SRC_DIR = path.join(ROOT_DIR, "src");
export const ASSETS_DIR = path.join(ROOT_DIR, "assets");

/** Production build output. This directory is the extension root. */
export const DIST_DIR = path.join(ROOT_DIR, "dist");

/** Development build output. Kept separate so `dist/` always holds a shippable build. */
export const DEV_DIST_DIR = path.join(ROOT_DIR, "dist-dev");

/** Directory where the uploadable `.zip` artifacts are written. */
export const RELEASE_DIR = path.join(ROOT_DIR, "release");

export const MANIFEST_SOURCE = path.join(SRC_DIR, "manifest.json");
export const CONTENT_CSS_SOURCE = path.join(SRC_DIR, "content", "content.css");

export interface ManifestContentScript {
  matches: string[];
  js?: string[];
  css?: string[];
  run_at?: string;
  all_frames?: boolean;
}

export interface WebAccessibleResource {
  resources: string[];
  matches?: string[];
  extension_ids?: string[];
}

export interface ExtensionManifest {
  manifest_version: number;
  name: string;
  version: string;
  description?: string;
  icons?: Record<string, string>;
  background?: {
    service_worker?: string;
    type?: string;
  };
  content_scripts?: ManifestContentScript[];
  web_accessible_resources?: WebAccessibleResource[];
  permissions?: string[];
  host_permissions?: string[];
  [key: string]: unknown;
}

/**
 * Lists every file below `root`, returned as POSIX-style paths relative to it.
 */
export async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path
        .relative(root, path.join(entry.parentPath, entry.name))
        .split(path.sep)
        .join("/"),
    )
    .sort();
}

/**
 * Lists the top-level entries (files and directories) of `root`.
 */
export async function listTopLevel(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });

  return entries.map((entry) => entry.name).sort();
}

/**
 * Matches a POSIX path against a `web_accessible_resources` pattern.
 * Only single-segment wildcards (`*`) are supported, which is what the
 * Chrome documentation describes for resource patterns.
 */
export function matchesResourcePattern(
  pattern: string,
  filePath: string,
): boolean {
  const patternSegments = pattern.split("/");
  const pathSegments = filePath.split("/");

  if (patternSegments.length !== pathSegments.length) return false;

  return patternSegments.every((segment, index) => {
    const pathSegment = pathSegments[index];
    if (pathSegment === undefined) return false;
    if (segment === "*") return pathSegment !== "";
    if (segment.includes("*")) {
      const escaped = segment
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      return new RegExp(`^${escaped}$`).test(pathSegment);
    }
    return segment === pathSegment;
  });
}
