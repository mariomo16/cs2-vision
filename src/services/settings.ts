export const BLOCK_SETTINGS_KEY = "cs2_vision_block_settings";

export const BLOCK_KEYS = ["csstats", "faceit", "leetify"] as const;

export type BlockKey = (typeof BLOCK_KEYS)[number];

export type BlockSettings = Record<BlockKey, boolean>;

export const DEFAULT_BLOCK_SETTINGS: BlockSettings = {
  csstats: true,
  faceit: true,
  leetify: true,
};

export function normalizeBlockSettings(value: unknown): BlockSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_BLOCK_SETTINGS };
  }

  const stored = value as Record<string, unknown>;

  return {
    csstats: typeof stored.csstats === "boolean" ? stored.csstats : true,
    faceit: typeof stored.faceit === "boolean" ? stored.faceit : true,
    leetify: typeof stored.leetify === "boolean" ? stored.leetify : true,
  };
}

export async function readBlockSettings(): Promise<BlockSettings> {
  const stored = (await chrome.storage.local.get(BLOCK_SETTINGS_KEY))[
    BLOCK_SETTINGS_KEY
  ];

  return normalizeBlockSettings(stored);
}

export async function writeBlockSettings(
  settings: BlockSettings,
): Promise<void> {
  await chrome.storage.local.set({ [BLOCK_SETTINGS_KEY]: settings });
}
