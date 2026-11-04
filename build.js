import esbuild from "esbuild";

const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  throw new Error("AUTH_TOKEN is not defined");
}

const sharedConfig = {
  bundle: true,
  target: "es2022",
  outdir: "dist",
  define: {
    __AUTH_TOKEN__: JSON.stringify(AUTH_TOKEN),
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
