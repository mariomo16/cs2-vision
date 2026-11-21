/**
 * Build-time constants injected by esbuild through `define`.
 *
 * `__DEV__` is `true` in development builds and `false` in production builds.
 * `__AUTH_TOKEN__` is only defined for the background service worker bundle.
 * `__BUILD_COMMIT__` is the short commit SHA the popup was built from.
 * `__BUILD_DATE__` is that commit's date (`YYYY-MM-DD`).
 */
declare const __DEV__: boolean;
declare const __AUTH_TOKEN__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_DATE__: string;
