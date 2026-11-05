declare const __AUTH_TOKEN__: string;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH" && typeof message.url === "string") {
    (async () => {
      try {
        const res = await fetch(message.url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const body = await res.text();
        sendResponse({ ok: true, body });
      } catch (error) {
        console.error("[CS2 Vision] FETCH:", error);
        sendResponse({ ok: false });
      }
    })();

    return true;
  }

  if (message.type === "FETCH_HTML" && typeof message.url === "string") {
    (async () => {
      try {
        const res = await fetch(message.url, {
          headers: {
            "x-custom-auth": __AUTH_TOKEN__,
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const body = await res.text();
        sendResponse({ ok: true, body });
      } catch (error) {
        console.error("[CS2 Vision] FETCH_HTML:", error);
        sendResponse({ ok: false });
      }
    })();

    return true;
  }
});
