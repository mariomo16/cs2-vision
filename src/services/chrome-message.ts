export const sendFetchMessage = async (url: string): Promise<string | null> => {
  try {
    const response = await chrome.runtime.sendMessage({ type: "FETCH", url });
    return response?.ok ? response.body : null;
  } catch {
    return null;
  }
};

export const sendFetchHtmlMessage = async (
  url: string,
): Promise<string | null> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_HTML",
      url,
    });
    return response?.ok ? response.body : null;
  } catch {
    return null;
  }
};
