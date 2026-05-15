import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultUserSettings, type FeedItem, type PlaybackProgress, type PlaybackQueueItem, type Source, type SourceMeta, type UserSettings } from "../domain/models";
import { loadBundledSources } from "./sourceCatalog";

type StorageKey = "sources" | "feed" | "savedIDs" | "readIDs" | "settings" | "queue" | "progress" | "checkpoint" | "firstLaunch" | "scrollToday" | "scrollAllUnread" | "lastSelectedNews" | "sourceMeta";

const keys: Record<StorageKey, string> = {
  sources: "mainstreetgazette.sources",
  feed: "mainstreetgazette.feed",
  savedIDs: "mainstreetgazette.savedIDs",
  readIDs: "mainstreetgazette.readIDs",
  settings: "mainstreetgazette.settings",
  queue: "mainstreetgazette.queue",
  progress: "mainstreetgazette.playbackProgress",
  checkpoint: "mainstreetgazette.checkpointDate",
  firstLaunch: "mainstreetgazette.firstLaunch",
  scrollToday: "mainstreetgazette.scrollToday",
  scrollAllUnread: "mainstreetgazette.scrollAllUnread",
  lastSelectedNews: "mainstreetgazette.lastSelectedNews",
  sourceMeta: "mainstreetgazette.sourceMeta",
};

const legacyKeys: Partial<Record<StorageKey, string>> = {
  sources: "pixiewire.sources",
  feed: "pixiewire.feed",
  savedIDs: "pixiewire.savedIDs",
  settings: "pixiewire.settings",
  queue: "pixiewire.queue",
  progress: "pixiewire.playbackProgress",
  checkpoint: "pixiewire.checkpointDate"
};

async function readJSON<T>(key: string, fallback: T, legacyKey?: string): Promise<T> {
  const raw = (await AsyncStorage.getItem(key)) ?? (legacyKey ? await AsyncStorage.getItem(legacyKey) : null);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadSources(): Promise<Source[]> {
  const stored = await readJSON<Source[] | null>(keys.sources, null, legacyKeys.sources);
  if (!stored) {
    const bundled = loadBundledSources();
    await saveSources(bundled);
    return bundled;
  }
  const bundled = loadBundledSources();
  const byID = new Map(stored.map((source) => [source.id, source]));
  const bundledIDs = new Set(bundled.map((source) => source.id));
  const merged = bundled.map((source) => {
    const storedSource = byID.get(source.id);
    return {
      ...source,
      isEnabled: storedSource?.isEnabled ?? source.isEnabled,
      lastRefreshAt: storedSource?.lastRefreshAt ?? source.lastRefreshAt,
      lastRefreshSucceeded: storedSource?.lastRefreshSucceeded ?? source.lastRefreshSucceeded,
      lastErrorMessage: storedSource?.lastErrorMessage ?? source.lastErrorMessage
    };
  });
  const sources = [...merged, ...stored.filter((source) => source.isCustom && !bundledIDs.has(source.id))];
  await saveSources(sources);
  return sources;
}

export async function saveSources(sources: Source[]): Promise<void> {
  await writeJSON(keys.sources, sources);
}

export async function loadCachedFeed(): Promise<FeedItem[]> {
  return readJSON(keys.feed, [], legacyKeys.feed);
}

export async function saveCachedFeed(items: FeedItem[]): Promise<void> {
  await writeJSON(keys.feed, items);
}

export async function loadSavedIDs(): Promise<string[]> {
  return readJSON(keys.savedIDs, [], legacyKeys.savedIDs);
}

export async function saveSavedIDs(ids: string[]): Promise<void> {
  await writeJSON(keys.savedIDs, ids);
}

export async function loadReadIDs(): Promise<string[]> {
  return readJSON(keys.readIDs, []);
}

export async function saveReadIDs(ids: string[]): Promise<void> {
  await writeJSON(keys.readIDs, ids);
}

export async function loadSettings(): Promise<UserSettings> {
  const stored = await readJSON<Partial<UserSettings>>(keys.settings, {}, legacyKeys.settings);
  return { ...defaultUserSettings, ...stored };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await writeJSON(keys.settings, settings);
}

export async function loadQueue(): Promise<PlaybackQueueItem[]> {
  return readJSON(keys.queue, [], legacyKeys.queue);
}

export async function saveQueue(queue: PlaybackQueueItem[]): Promise<void> {
  await writeJSON(keys.queue, queue);
}

export async function loadPlaybackProgress(): Promise<PlaybackProgress[]> {
  return readJSON(keys.progress, [], legacyKeys.progress);
}

export async function savePlaybackProgress(progress: PlaybackProgress): Promise<void> {
  const all = await loadPlaybackProgress();
  const withoutCurrent = all.filter((item) => item.feedItemID !== progress.feedItemID);
  await writeJSON(keys.progress, [...withoutCurrent, progress]);
}

export async function loadCheckpointDate(): Promise<string | null> {
  return readJSON<string | null>(keys.checkpoint, null, legacyKeys.checkpoint);
}

export async function saveCheckpointDate(isoDate: string): Promise<void> {
  await writeJSON(keys.checkpoint, isoDate);
}

export async function loadHasLaunchedBefore(): Promise<boolean> {
  return readJSON<boolean>(keys.firstLaunch, false);
}

export async function saveHasLaunchedBefore(): Promise<void> {
  await writeJSON(keys.firstLaunch, true);
}

type ScrollPositionData = { itemID: string | null; offset: number };

export async function loadScrollPosition(mode: "today" | "allUnread"): Promise<ScrollPositionData | null> {
  const raw = await AsyncStorage.getItem(mode === "today" ? keys.scrollToday : keys.scrollAllUnread);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScrollPositionData;
  } catch {
    return null;
  }
}

export async function saveScrollPosition(mode: "today" | "allUnread", data: ScrollPositionData): Promise<void> {
  await AsyncStorage.setItem(mode === "today" ? keys.scrollToday : keys.scrollAllUnread, JSON.stringify(data));
}

export async function loadLastSelectedID(): Promise<string | null> {
  return AsyncStorage.getItem(keys.lastSelectedNews);
}

export async function saveLastSelectedID(itemID: string): Promise<void> {
  await AsyncStorage.setItem(keys.lastSelectedNews, itemID);
}

export async function loadSourceMeta(): Promise<Record<string, SourceMeta>> {
  return readJSON(keys.sourceMeta, {});
}

export async function saveSourceMeta(meta: Record<string, SourceMeta>): Promise<void> {
  await writeJSON(keys.sourceMeta, meta);
}
