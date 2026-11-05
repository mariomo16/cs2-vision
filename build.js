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

const sharedConfig = {
  bundle: true,
  target: "es2022",
  outdir: "dist",
  define: {
    __DEV__: JSON.stringify(!isProduction),
    __AUTH_TOKEN__: JSON.stringify(authToken),
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
]);
