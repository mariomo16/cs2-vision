import esbuild from "esbuild";

const isProduction = process.env.NODE_ENV === "production";
const authToken = process.env.AUTH_TOKEN;

if (isProduction && !authToken) {
  throw new Error("authToken is required in production");
}

const sharedConfig = {
  bundle: true,
  target: "es2022",
  outdir: "dist",
  define: {
    __DEV__: JSON.stringify(!isProduction),
    __AUTH_TOKEN__: JSON.stringify(isProduction ? authToken : ""),
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
