import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { type BuildOptions, build } from "esbuild";
import {
  ASSETS_DIR,
  CONTENT_CSS_SOURCE,
  DEV_DIST_DIR,
  DIST_DIR,
  MANIFEST_SOURCE,
  POPUP_HTML_SOURCE,
} from "./lib/extension.ts";

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
]);

// The manifest, the content script stylesheet and the static assets are copied
// verbatim, so the output directory is a self-contained, loadable extension.
await Promise.all([
  cp(MANIFEST_SOURCE, path.join(outDir, "manifest.json")),
  cp(CONTENT_CSS_SOURCE, path.join(outDir, "content.css")),
  cp(POPUP_HTML_SOURCE, path.join(outDir, "popup.html")),
  cp(ASSETS_DIR, path.join(outDir, "assets"), { recursive: true }),
]);

console.log(
  `Built ${path.relative(process.cwd(), outDir)} (${
    isProduction ? "production" : "development"
  })`,
);
