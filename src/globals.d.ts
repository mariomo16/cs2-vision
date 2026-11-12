/**
 * Build-time constants injected by esbuild through `define`.
 *
 * `__DEV__` is `true` in development builds and `false` in production builds.
 * `__AUTH_TOKEN__` is only defined for the background service worker bundle.
 */
declare const __DEV__: boolean;
declare const __AUTH_TOKEN__: string;
