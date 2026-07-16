import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultUserSettings, type FeedItem, type PlaybackProgress, type PlaybackQueueItem, type Source, type SourceMeta, type Trip, type UserSettings } from "../domain/models";
import { loadBundledSources } from "./sourceCatalog";

type StorageKey = "sources" | "feed" | "savedIDs" | "readIDs" | "settings" | "queue" | "progress" | "checkpoint" | "firstLaunch" | "scrollToday" | "scrollAllUnread" | "lastSelectedNews" | "sourceMeta" | "lastVisit" | "seenTimestamps" | "lastCachedAt" | "notifiedClusterIDs" | "trips";

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
  lastVisit: "mainstreetgazette.lastVisit",
  seenTimestamps: "mainstreetgazette.seenTimestamps",
  lastCachedAt: "mainstreetgazette.lastCachedAt",
  notifiedClusterIDs: "mainstreetgazette.notifiedClusterIDs",
  trips: "mainstreetgazette.trips",
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
    // Match by new ID first, then fall back to legacyId to preserve user settings after ID migration
    const storedSource = byID.get(source.id) ?? (source.legacyId ? byID.get(source.legacyId) : undefined);
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
  const raw = await readJSON<Record<string, unknown>>(keys.settings, {}, legacyKeys.settings);
  const stored = raw as Partial<UserSettings>;
  // Phase 07 migration: cardDensity's old "comfortable" value was renamed "standard"
  // when a third state ("spacious") was added.
  const cardDensity: UserSettings["cardDensity"] | undefined =
    raw.cardDensity === "comfortable" ? "standard" : (raw.cardDensity as UserSettings["cardDensity"] | undefined);
  // Phase 07 migration: fold the old, real showThumbnails setting into the new
  // artworkDensity enum for anyone who'd already turned thumbnails off. showArtwork
  // was never actually consumed by any renderer, so it isn't part of this migration.
  const artworkDensity: UserSettings["artworkDensity"] | undefined =
    (raw.artworkDensity as UserSettings["artworkDensity"] | undefined) ?? (raw.showThumbnails === false ? "textFirst" : undefined);
  return {
    ...defaultUserSettings,
    ...stored,
    ...(cardDensity ? { cardDensity } : {}),
    ...(artworkDensity ? { artworkDensity } : {}),
  };
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

type ScrollPositionData = { itemID: string | null; offset: number; publishedAt?: string | null };

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

export async function loadLastVisit(): Promise<string | null> {
  return AsyncStorage.getItem(keys.lastVisit);
}

export async function saveLastVisit(isoDate: string): Promise<void> {
  await AsyncStorage.setItem(keys.lastVisit, isoDate);
}

export async function loadSeenTimestamps(): Promise<Record<string, string>> {
  return readJSON(keys.seenTimestamps, {});
}

export async function saveSeenTimestamps(timestamps: Record<string, string>): Promise<void> {
  await writeJSON(keys.seenTimestamps, timestamps);
}

export async function loadLastCachedAt(): Promise<string | null> {
  return AsyncStorage.getItem(keys.lastCachedAt);
}

export async function saveLastCachedAt(isoDate: string): Promise<void> {
  await AsyncStorage.setItem(keys.lastCachedAt, isoDate);
}

// Phase 08 — tracks which story clusters have already been delivered as a
// notification, so a background run every ~15 minutes doesn't re-notify the same
// story. Capped to the most recent 500 so this never grows unbounded.
const MAX_NOTIFIED_CLUSTER_IDS = 500;

export async function loadNotifiedClusterIDs(): Promise<string[]> {
  return readJSON(keys.notifiedClusterIDs, []);
}

export async function addNotifiedClusterIDs(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const existing = await loadNotifiedClusterIDs();
  const merged = [...existing, ...ids];
  const trimmed = merged.slice(Math.max(0, merged.length - MAX_NOTIFIED_CLUSTER_IDS));
  await writeJSON(keys.notifiedClusterIDs, trimmed);
}

// Phase 08 — Trip Companion trips.
export async function loadTrips(): Promise<Trip[]> {
  return readJSON(keys.trips, []);
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  await writeJSON(keys.trips, trips);
}

// Removes unsaved articles older than cutoffDays from the cached feed.
// Saved items are always kept regardless of age.
export async function purgeOlderThan(cutoffDays: number): Promise<void> {
  const items = await loadCachedFeed();
  const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
  const kept = items.filter(
    (item) => item.isSaved || new Date(item.publishedAt).getTime() >= cutoff
  );
  await saveCachedFeed(kept);
}

// Phase 06 — Living Gazette Library storage tiers. Archived records purge entirely
// once they're this many times older than the "remembered" window, so unsaved metadata
// doesn't accumulate forever.
const ARCHIVE_PURGE_MULTIPLIER = 4;

function ageInDays(publishedAt: string): number {
  return (Date.now() - new Date(publishedAt).getTime()) / (24 * 60 * 60 * 1000);
}

// Applies the four-tier storage model to a cached feed:
// - User-owned (isSaved): always kept in full, exempt from every rule below.
// - Fresh (age <= freshDays): kept in full.
// - Remembered (freshDays < age <= rememberedDays): images dropped, summary/tags/
//   relationships/URL kept.
// - Archived (rememberedDays < age <= archivedPurgeDays): trimmed to a minimum
//   searchable record (id/title/URL/source/date/tags only).
// - Older than archivedPurgeDays: dropped entirely.
// When settings.optimizeStorageAutomatically is false ("Keep Everything Available"),
// this is a no-op other than tagging everything "fresh".
export function applyStorageTiers(
  items: FeedItem[],
  settings: Pick<UserSettings, "retentionWindowDays" | "cacheWindowDays" | "optimizeStorageAutomatically">
): FeedItem[] {
  if (!settings.optimizeStorageAutomatically) {
    return items.map((item) => (item.contentTier === "fresh" ? item : { ...item, contentTier: "fresh" as const }));
  }

  const freshDays = settings.retentionWindowDays;
  const rememberedDays = settings.cacheWindowDays;
  const archivedPurgeDays = rememberedDays * ARCHIVE_PURGE_MULTIPLIER;

  const kept: FeedItem[] = [];
  for (const item of items) {
    if (item.isSaved) {
      kept.push(item.contentTier === "fresh" ? item : { ...item, contentTier: "fresh" as const });
      continue;
    }

    const age = ageInDays(item.publishedAt);

    if (age <= freshDays) {
      kept.push(item.contentTier === "fresh" ? item : { ...item, contentTier: "fresh" as const });
      continue;
    }

    if (age <= rememberedDays) {
      if (item.contentTier === "remembered" && item.thumbnailURL == null && item.artworkURL == null) {
        kept.push(item);
      } else {
        kept.push({ ...item, contentTier: "remembered" as const, thumbnailURL: null, artworkURL: null });
      }
      continue;
    }

    if (age <= archivedPurgeDays) {
      if (item.contentTier === "archived") {
        kept.push(item);
      } else {
        kept.push({
          id: item.id,
          sourceID: item.sourceID,
          sourceType: item.sourceType,
          contentType: item.contentType,
          title: item.title,
          canonicalURL: item.canonicalURL,
          publishedAt: item.publishedAt,
          isSaved: false,
          isRead: item.isRead,
          isNewRelativeToCheckpoint: false,
          isDownloaded: false,
          downloadState: "notDownloaded",
          tags: item.tags,
          contentTier: "archived" as const,
        });
      }
      continue;
    }

    // Older than the archive ceiling and never saved — drop entirely.
  }
  return kept;
}
