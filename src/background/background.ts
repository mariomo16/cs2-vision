const ALLOWED_HOSTS = ["csstats.gg", "cs2-lens-proxy.vercel.app"];

const REQUEST_TIMEOUT_MS = 15_000;

const isAllowedUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return url.protocol === "https:" && ALLOWED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
};

const isStatsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return (
      url.hostname === "csstats.gg" &&
      /^\/player\/\d+\/stats\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH" && typeof message.url === "string") {
    if (!isAllowedUrl(message.url)) {
      sendResponse({ ok: false });
      return true;
    }

    (async () => {
      try {
        const res = await fetch(message.url, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const body = await res.text();
        sendResponse({ ok: true, body });
      } catch (error) {
        __DEV__ && console.error("[CS2 Vision] FETCH:", error);
        sendResponse({ ok: false });
      }
    })();

    return true;
  }

  if (message.type === "FETCH_HTML" && typeof message.url === "string") {
    if (!isAllowedUrl(message.url) || !isStatsUrl(message.url)) {
      sendResponse({ ok: false });
      return true;
    }

    (async () => {
      try {
        const res = await fetch(message.url, {
          headers: {
            "x-custom-auth": __AUTH_TOKEN__,
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const body = await res.text();
        sendResponse({ ok: true, body });
      } catch (error) {
        __DEV__ && console.error("[CS2 Vision] FETCH_HTML:", error);
        sendResponse({ ok: false });
      }
    })();

    return true;
  }

  return false;
});
