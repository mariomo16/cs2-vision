import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { type BuildOptions, build } from "esbuild";
import {
  ASSETS_DIR,
  CONTENT_CSS_SOURCE,
  DEV_DIST_DIR,
  DIST_DIR,
  type ExtensionManifest,
  MANIFEST_SOURCE,
  POPUP_HTML_SOURCE,
  ROOT_DIR,
} from "./lib/extension.ts";

const DEV_NAME_SUFFIX = " (Dev)";

function getBuildCommit(): string {
  const githubSha = process.env.GITHUB_SHA;
  if (githubSha) return githubSha.slice(0, 7);

  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function getBuildDate(): string {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs"], {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const isProduction = process.env.NODE_ENV === "production";

// `.env.local` is only a fallback: dotenv never overrides a variable that is
// already defined, so CI keeps using the real secret.
loadEnv({ path: ".env.local", quiet: true });

const authToken = process.env.AUTH_TOKEN;

if (!authToken) {
  throw new Error(
    "AUTH_TOKEN is required. Set it in .env.local for local builds, or in the CI environment.",
  );
}

// `dist/` holds the shippable extension and `dist-dev/` the development build,
// so a development build can never be mistaken for a release artifact.
const outDir = isProduction ? DIST_DIR : DEV_DIST_DIR;

const shared: BuildOptions = {
  bundle: true,
  target: "es2022",
  minify: isProduction,
  legalComments: "none",
  logLevel: "warning",
};

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await Promise.all([
  build({
    ...shared,
    entryPoints: { content: "src/content/content.ts" },
    format: "iife",
    outfile: path.join(outDir, "content.js"),
    define: {
      __DEV__: JSON.stringify(!isProduction),
    },
  }),
  build({
    ...shared,
    entryPoints: { background: "src/background/background.ts" },
    format: "esm",
    outfile: path.join(outDir, "background.js"),
    define: {
      __DEV__: JSON.stringify(!isProduction),
      __AUTH_TOKEN__: JSON.stringify(authToken),
    },
  }),
  build({
    ...shared,
    entryPoints: { popup: "src/popup/popup.ts" },
    format: "iife",
    outfile: path.join(outDir, "popup.js"),
    define: {
      __BUILD_COMMIT__: JSON.stringify(getBuildCommit()),
      __BUILD_DATE__: JSON.stringify(getBuildDate()),
    },
  }),
]);

// The manifest, the content script stylesheet and the static assets are copied
// verbatim, so the output directory is a self-contained, loadable extension.
// The development build is labelled so it cannot be confused with the store
// build when both are installed from their unpacked directories.
const manifest = JSON.parse(
  await readFile(MANIFEST_SOURCE, "utf8"),
) as ExtensionManifest;

if (!isProduction) {
  manifest.name = `${manifest.name}${DEV_NAME_SUFFIX}`;
}

const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

await Promise.all([
  writeFile(path.join(outDir, "manifest.json"), manifestJson),
  cp(CONTENT_CSS_SOURCE, path.join(outDir, "content.css")),
  cp(POPUP_HTML_SOURCE, path.join(outDir, "popup.html")),
  cp(ASSETS_DIR, path.join(outDir, "assets"), { recursive: true }),
]);

console.log(
  `Built ${path.relative(process.cwd(), outDir)} (${
    isProduction ? "production" : "development"
  })`,
);
