import { execFileSync } from "node:child_process";
import { copyFile } from "node:fs/promises";
import dotenv from "dotenv";
import esbuild from "esbuild";

const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  dotenv.config({ path: ".env.local" });
}

const authToken = process.env.AUTH_TOKEN;

if (!authToken) {
  throw new Error("AUTH_TOKEN is required");
}

const getBuildCommit = () => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) ?? "";
  }
};

const sharedConfig = {
  bundle: true,
  target: "es2022",
  outdir: "dist",
  define: {
    __DEV__: JSON.stringify(!isProduction),
    __AUTH_TOKEN__: JSON.stringify(authToken),
    __BUILD_COMMIT__: JSON.stringify(getBuildCommit()),
  },
};

await Promise.all([
  esbuild.build({
    ...sharedConfig,
    entryPoints: { content: "src/content/content.ts" },
    format: "iife",
  }),
  esbuild.build({
    ...sharedConfig,
    entryPoints: { background: "src/background/background.ts" },
    format: "esm",
  }),
  esbuild.build({
    ...sharedConfig,
    entryPoints: { popup: "src/popup/popup.ts" },
    format: "iife",
  }),
  copyFile("src/popup/popup.html", "dist/popup.html"),
  copyFile("src/popup/popup.css", "dist/popup.css"),
]);
