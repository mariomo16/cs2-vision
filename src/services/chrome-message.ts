export function sendFetchMessage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "FETCH", url },
      (response: { ok: boolean; body?: string }) => {
        if (chrome.runtime.lastError || !response?.ok) {
          resolve(null);
        } else {
          resolve(response.body ?? null);
        }
      },
    );
  });
}

export const sendFetchHtmlMessage = async (
  url: string,
): Promise<string | null> => {
  const response = await chrome.runtime.sendMessage({
    type: "FETCH_HTML",
    url,
  });

  return response?.ok ? response.body : null;
};
