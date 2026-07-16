import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import i18n from "../i18n";
import { AccessibilityInfo, AppState } from "react-native";
import type { FeedItem, Source, SourceMeta, UserSettings } from "../domain/models";
import { refreshFeeds } from "../services/feedEngine";
import { adaptFeedItemsToContentItems } from "../services/contentItemAdapter";
import { clusterContentItems } from "../services/storyClusterService";
import type { StoryCluster } from "../types/storyTypes";
import {
  applyStorageTiers,
  loadCachedFeed,
  loadCheckpointDate,
  loadHasLaunchedBefore,
  loadLastCachedAt,
  loadLastVisit,
  loadReadIDs,
  loadSavedIDs,
  loadSeenTimestamps,
  loadSettings,
  loadSourceMeta,
  loadSources,
  purgeOlderThan,
  saveCachedFeed,
  saveCheckpointDate,
  saveHasLaunchedBefore,
  saveLastCachedAt,
  saveLastVisit,
  saveReadIDs,
  saveSavedIDs,
  saveSeenTimestamps,
  saveSettings,
  saveSourceMeta,
  saveSources
} from "../services/storage";
import { fetchNetworkState } from "../hooks/useNetworkState";
import { stripHTML } from "../utils/formatting";
import { applyParkTags } from "../utils/parkTagger";
import { indexFeedItems } from "../services/spotlight";
import { updateWidgetData } from "../services/widgetData";

interface AppContextValue {
  items: FeedItem[];
  sources: Source[];
  savedIDs: string[];
  readIDs: string[];
  seenTimestamps: Record<string, string>;
  savedItems: FeedItem[];
  settings: UserSettings | null;
  clusters: StoryCluster[];
  sourceMeta: Record<string, SourceMeta>;
  lastRefreshAt: Date | null;
  lastVisitTimestamp: string | null;
  isLoading: boolean;
  isFirstLaunch: boolean | null;
  isRefreshing: boolean;
  errorMessage: string | null;
  lastRefreshSummary: string | null;
  newArticlesSinceLastVisit: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
  completeOnboarding: (sources: Source[], settings: UserSettings) => Promise<void>;
  toggleSaved: (itemID: string) => Promise<void>;
  toggleSource: (sourceID: string) => Promise<void>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  markAsRead: (itemID: string) => Promise<void>;
  markAsUnread: (itemID: string) => Promise<void>;
  markAllAsRead: () => Promise<number>;
  muteSource: (sourceID: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function mergeRead(items: FeedItem[], readIDs: string[]): FeedItem[] {
  return items.map((item) => ({ ...item, isRead: readIDs.includes(item.id) }));
}

function mergeSaved(items: FeedItem[], savedIDs: string[]): FeedItem[] {
  return items.map((item) => ({
    ...item,
    title: stripHTML(item.title),
    subtitle: item.subtitle ? stripHTML(item.subtitle) : item.subtitle,
    summary: item.summary ? stripHTML(item.summary) : item.summary,
    authorOrChannel: item.authorOrChannel ? stripHTML(item.authorOrChannel) : item.authorOrChannel,
    isSaved: savedIDs.includes(item.id)
  }));
}

function refreshFailureMessage(failures: { sourceID: string; message: string }[], sources: Source[]): string {
  if (failures.length === 0) return "";
  if (failures.length === 1) {
    const name = sources.find((s) => s.id === failures[0].sourceID)?.name ?? "1 source";
    return i18n.t("errors.sourceFailed_one", { name });
  }
  return i18n.t("errors.sourceFailed_other", { count: failures.length });
}

function refreshErrorMessage(failures: { sourceID: string; message: string }[]): string {
  if (failures.length === 0) return i18n.t("errors.noStories");
  const firstFailure = failures[0];
  return failures.length === 1
    ? i18n.t("errors.refreshFailed_one", { message: firstFailure.message })
    : i18n.t("errors.refreshFailed_other", { count: failures.length, message: firstFailure.message });
}

// Applies the Phase 06 storage-tier model (fresh/remembered/archived, see
// applyStorageTiers in services/storage.ts) rather than a hard age cutoff — older
// unsaved items shrink instead of disappearing outright.
export function enforceCacheWindow(
  items: FeedItem[],
  settings: Pick<UserSettings, "retentionWindowDays" | "cacheWindowDays" | "optimizeStorageAutomatically">
): FeedItem[] {
  return applyStorageTiers(items, settings).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [savedIDs, setSavedIDs] = useState<string[]>([]);
  const [readIDs, setReadIDs] = useState<string[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshSummary, setLastRefreshSummary] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceMeta, setSourceMeta] = useState<Record<string, SourceMeta>>({});
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [seenTimestamps, setSeenTimestamps] = useState<Record<string, string>>({});
  const [lastVisitTimestamp, setLastVisitTimestamp] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);
  const autoRefreshAttemptedRef = useRef(false);
  const isFirstLaunchRef = useRef(false);
  const sourceMetaRef = useRef<Record<string, SourceMeta>>({});
  const lastVisitRef = useRef<string | null>(null);
  // Tracks which source IDs have already triggered the "temporarily unavailable" VoiceOver announcement
  // this session, so we don't repeat it on every refresh while the source is still backing off.
  const announcedUnavailableRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const checkpointDate = await loadCheckpointDate();

      // Snapshot whether the list already has content before this refresh starts.
      // Streaming progress updates are only applied to an empty list — updating a
      // live list mid-read would shuffle items under VoiceOver users' focus.
      const hadItemsBefore = items.length > 0;

      const onProgress = (partialItems: FeedItem[]) => {
        if (hadItemsBefore) return;
        let displayItems = mergeRead(partialItems, readIDs);
        if (isFirstLaunchRef.current) {
          const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
          displayItems = displayItems.filter((item) => new Date(item.publishedAt).getTime() >= threeDaysAgo);
        }
        setItems(displayItems);
      };

      const result = await refreshFeeds(sources, savedIDs, sourceMetaRef.current, items, checkpointDate, onProgress);
      sourceMetaRef.current = result.updatedSourceMeta;
      setSourceMeta(result.updatedSourceMeta);
      const refreshedAt = new Date();
      setLastRefreshAt(refreshedAt);
      saveLastCachedAt(refreshedAt.toISOString()).catch(() => {});

      // Announce once per session when a source crosses the 3-failure threshold.
      const now = Date.now();
      for (const [sourceID, meta] of Object.entries(result.updatedSourceMeta)) {
        const isUnavailable =
          (meta.failureCount ?? 0) >= 3 &&
          !!meta.nextRetryAt &&
          now < new Date(meta.nextRetryAt).getTime();
        if (isUnavailable && !announcedUnavailableRef.current.has(sourceID)) {
          announcedUnavailableRef.current.add(sourceID);
          const name = sources.find((s) => s.id === sourceID)?.name ?? i18n.t("errors.unknownSource");
          AccessibilityInfo.announceForAccessibility(
            i18n.t("errors.sourceUnavailable", { name })
          );
        } else if (!isUnavailable) {
          announcedUnavailableRef.current.delete(sourceID);
        }
      }

      const failureText = refreshFailureMessage(result.failures, sources);

      // On first-ever launch, restrict feed to the past 3 days so the initial
      // load isn't overwhelming. Subsequent launches get the full source output.
      let freshItems = result.items;
      if (isFirstLaunchRef.current) {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        freshItems = freshItems.filter((item) => new Date(item.publishedAt).getTime() >= threeDaysAgo);
      }

      // Apply storage tiers; saved items are always kept in full.
      if (settings) {
        freshItems = enforceCacheWindow(freshItems, settings);
      }

      const shouldKeepExistingFeed = freshItems.length === 0 && items.length > 0;

      if (!shouldKeepExistingFeed) {
        const readItems = mergeRead(freshItems, readIDs);
        // Only re-render the list if items actually changed. Identical result (no new
        // stories) should be a silent no-op so VoiceOver focus is never disrupted.
        const existingIDs = new Set(items.map((item) => item.id));
        const hasNewItems = readItems.some((item) => !existingIDs.has(item.id));
        if (hasNewItems || !hadItemsBefore) {
          setItems(readItems);
        }
        await saveCachedFeed(readItems);
      }
      await saveSourceMeta(result.updatedSourceMeta);

      if (isFirstLaunchRef.current) {
        await saveHasLaunchedBefore();
        isFirstLaunchRef.current = false;
      }

      // Index fresh items into CoreSpotlight for iOS Search (best-effort).
      if (!shouldKeepExistingFeed) {
        indexFeedItems(freshItems).catch(() => {});
      }

      const existingIDs = new Set(items.map((item) => item.id));
      const newItemCount = freshItems.filter((item) => !existingIDs.has(item.id)).length;
      const summary = shouldKeepExistingFeed || newItemCount === 0
        ? (failureText ? i18n.t("refresh.noNewWithError", { error: failureText }) : i18n.t("refresh.noNew"))
        : (failureText
          ? i18n.t("refresh.newWithError_one", { count: newItemCount, error: failureText })
          : i18n.t("refresh.new_one", { count: newItemCount }));
      setErrorMessage(freshItems.length === 0 ? refreshErrorMessage(result.failures) : null);
      setLastRefreshSummary(summary);
      AccessibilityInfo.announceForAccessibility(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : i18n.t("errors.unableToRefresh");
      setErrorMessage(message);
      AccessibilityInfo.announceForAccessibility(i18n.t("refresh.failedAnnounce", { message }));
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [items, readIDs, savedIDs, settings, sources]);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      // Load sources, settings, and ids first (small/fast) so the UI can show immediately.
      const [loadedSources, loadedSavedIDs, loadedReadIDs, loadedSettings, hasLaunchedBefore, loadedSourceMeta, loadedLastVisit, loadedSeenTimestamps, loadedLastCachedAt] = await Promise.all([
        loadSources(),
        loadSavedIDs(),
        loadReadIDs(),
        loadSettings(),
        loadHasLaunchedBefore(),
        loadSourceMeta(),
        loadLastVisit(),
        loadSeenTimestamps(),
        loadLastCachedAt()
      ]);
      lastVisitRef.current = loadedLastVisit;
      sourceMetaRef.current = loadedSourceMeta;
      if (!mounted) return;
      setSourceMeta(loadedSourceMeta);
      setSeenTimestamps(loadedSeenTimestamps);
      setLastVisitTimestamp(loadedLastVisit);
      isFirstLaunchRef.current = !hasLaunchedBefore;
      setIsFirstLaunch(!hasLaunchedBefore);
      setSources(loadedSources);
      setSavedIDs(loadedSavedIDs);
      setReadIDs(loadedReadIDs);
      setSettings(loadedSettings);
      if (loadedLastCachedAt) setLastRefreshAt(new Date(loadedLastCachedAt));
      setIsLoading(false);

      // Load the feed cache in the background — only populate if a network refresh
      // hasn't already provided items (avoids overwriting fresh data with stale cache).
      const cachedFeed = enforceCacheWindow(await loadCachedFeed(), loadedSettings);
      await saveCachedFeed(cachedFeed);
      if (!mounted) return;
      const retagged = cachedFeed.map((item) => ({
        ...item,
        tags: applyParkTags(`${item.title} ${item.summary ?? ""}`, item.tags),
      }));
      const cachedItems = mergeRead(mergeSaved(retagged, loadedSavedIDs), loadedReadIDs);
      setItems((prev) => (prev.length > 0 ? prev : cachedItems));
    }
    hydrate().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : i18n.t("errors.unableToLoad"));
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && settings?.autoRefreshOnLaunch && sources.length > 0 && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      (async () => {
        // 2A: Skip if the cached feed is less than 15 minutes old.
        const STALE_MS = 15 * 60_000;
        const lastCached = await loadLastCachedAt().catch(() => null);
        if (lastCached && Date.now() - new Date(lastCached).getTime() < STALE_MS) return;
        // 2D: Skip on offline or slow connection — OfflineBanner handles the visual.
        const network = await fetchNetworkState().catch(() => null);
        if (network?.isSlowConnection) return;
        refresh();
      })();
    }
  }, [isLoading, refresh, settings?.autoRefreshOnLaunch, sources.length]);

  // Keep a stable ref to the latest refresh so the interval never captures a stale closure
  // and doesn't need to reset the 60s countdown every time items update during streaming.
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    if (isLoading || isFirstLaunch || sources.length === 0) return;
    const interval = setInterval(async () => {
      if (AppState.currentState !== "active") return;
      // Skip background auto-refresh on slow / no connection (2D).
      // Manual pull-to-refresh always proceeds regardless.
      const network = await fetchNetworkState().catch(() => null);
      if (network?.isSlowConnection) return;
      refreshRef.current();
    }, 300_000);
    return () => clearInterval(interval);
  }, [isLoading, isFirstLaunch, sources.length]);

  // Save the current timestamp as lastVisit when the app moves to background.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        const now = new Date().toISOString();
        lastVisitRef.current = now;
        setLastVisitTimestamp(now);
        saveLastVisit(now).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  const toggleSaved = useCallback(
    async (itemID: string) => {
      const nextSaved = savedIDs.includes(itemID) ? savedIDs.filter((id) => id !== itemID) : [...savedIDs, itemID];
      const nextItems = mergeSaved(items, nextSaved);
      setSavedIDs(nextSaved);
      setItems(nextItems);
      await Promise.all([saveSavedIDs(nextSaved), saveCachedFeed(nextItems)]);
      AccessibilityInfo.announceForAccessibility(nextSaved.includes(itemID) ? i18n.t("refresh.articleSaved") : i18n.t("refresh.articleUnsaved"));
    },
    [items, savedIDs]
  );

  const toggleSource = useCallback(
    async (sourceID: string) => {
      const nextSources = sources.map((source) => (source.id === sourceID ? { ...source, isEnabled: !source.isEnabled } : source));
      setSources(nextSources);
      await saveSources(nextSources);
      const source = nextSources.find((candidate) => candidate.id === sourceID);
      if (source) {
        AccessibilityInfo.announceForAccessibility(`${source.name} ${source.isEnabled ? i18n.t("a11y.enabled") : i18n.t("a11y.disabled")}`);
      }
    },
    [sources]
  );

  const muteSource = useCallback(
    async (sourceID: string) => {
      const source = sources.find((candidate) => candidate.id === sourceID);
      if (!source || !source.isEnabled) return;
      const nextSources = sources.map((candidate) => (candidate.id === sourceID ? { ...candidate, isEnabled: false } : candidate));
      setSources(nextSources);
      await saveSources(nextSources);
      AccessibilityInfo.announceForAccessibility(i18n.t("a11y.sourceMuted", { name: source.name }));
    },
    [sources]
  );

  const completeOnboarding = useCallback(async (finalSources: Source[], finalSettings: UserSettings) => {
    setSources(finalSources);
    setSettings(finalSettings);
    setIsFirstLaunch(false);
    await Promise.all([
      saveSources(finalSources),
      saveSettings(finalSettings),
      saveHasLaunchedBefore(),
    ]);
  }, []);

  const updateSettings = useCallback(async (nextSettings: UserSettings) => {
    setSettings(nextSettings);
    await saveSettings(nextSettings);
    const tieringChanged =
      settings?.cacheWindowDays !== nextSettings.cacheWindowDays ||
      settings?.retentionWindowDays !== nextSettings.retentionWindowDays ||
      settings?.optimizeStorageAutomatically !== nextSettings.optimizeStorageAutomatically;
    if (tieringChanged) {
      const cachedFeed = await loadCachedFeed();
      const tiered = enforceCacheWindow(cachedFeed, nextSettings);
      await saveCachedFeed(tiered);
      const readItems = mergeRead(mergeSaved(tiered, savedIDs), readIDs);
      setItems(readItems);
    }
  }, [
    readIDs,
    savedIDs,
    settings?.cacheWindowDays,
    settings?.retentionWindowDays,
    settings?.optimizeStorageAutomatically,
  ]);

  const markAsRead = useCallback(
    async (itemID: string) => {
      if (readIDs.includes(itemID)) return;
      const nextReadIDs = [...readIDs, itemID];
      const nextItems = items.map((item) => (item.id === itemID ? { ...item, isRead: true } : item));
      const nextSeenTimestamps = { ...seenTimestamps, [itemID]: new Date().toISOString() };
      setReadIDs(nextReadIDs);
      setItems(nextItems);
      setSeenTimestamps(nextSeenTimestamps);
      await Promise.all([saveReadIDs(nextReadIDs), saveCachedFeed(nextItems), saveSeenTimestamps(nextSeenTimestamps)]);
    },
    [items, readIDs, seenTimestamps]
  );

  const markAsUnread = useCallback(
    async (itemID: string) => {
      if (!readIDs.includes(itemID)) return;
      const nextReadIDs = readIDs.filter((id) => id !== itemID);
      const nextItems = items.map((item) => (item.id === itemID ? { ...item, isRead: false } : item));
      setReadIDs(nextReadIDs);
      setItems(nextItems);
      await Promise.all([saveReadIDs(nextReadIDs), saveCachedFeed(nextItems)]);
    },
    [items, readIDs]
  );

  // Marking everything as read also means nothing is "new" anymore, so this
  // advances the checkpoint to now — the only other place isNewRelativeToCheckpoint
  // used to be cleared was the per-item "Set Marker" action, since removed.
  const markAllAsRead = useCallback(async (): Promise<number> => {
    const unread = items.filter((item) => !readIDs.includes(item.id));
    const now = new Date().toISOString();
    const nowTime = new Date(now).getTime();
    const nextReadIDs = unread.length > 0 ? [...readIDs, ...unread.map((item) => item.id)] : readIDs;
    const nextSeenTimestamps = { ...seenTimestamps };
    for (const item of unread) nextSeenTimestamps[item.id] = now;
    const nextItems = items.map((item) => ({
      ...item,
      isRead: true,
      isNewRelativeToCheckpoint: new Date(item.publishedAt).getTime() > nowTime
    }));
    setReadIDs(nextReadIDs);
    setSeenTimestamps(nextSeenTimestamps);
    setItems(nextItems);
    await Promise.all([
      saveReadIDs(nextReadIDs),
      saveSeenTimestamps(nextSeenTimestamps),
      saveCachedFeed(nextItems),
      saveCheckpointDate(now)
    ]);
    return unread.length;
  }, [items, readIDs, seenTimestamps]);

  const clearCache = useCallback(async () => {
    const windowDays = settings?.cacheWindowDays ?? 30;
    await purgeOlderThan(windowDays);
    const cachedFeed = await loadCachedFeed();
    const readItems = mergeRead(mergeSaved(cachedFeed, savedIDs), readIDs);
    setItems(readItems);
  }, [settings?.cacheWindowDays, savedIDs, readIDs]);

  // Push unread count + latest headline to WidgetKit whenever items or read state changes.
  useEffect(() => {
    if (items.length === 0 || isLoading) return;
    const sourceNames = new Map(sources.map((s) => [s.id, s.name]));
    updateWidgetData(items, readIDs, sourceNames).catch(() => {});
  }, [items, readIDs, sources, isLoading]);

  const savedItems = useMemo(() => items.filter((item) => savedIDs.includes(item.id)), [items, savedIDs]);

  const clusters = useMemo<StoryCluster[]>(() => {
    if (items.length === 0 || sources.length === 0) return [];
    const contentItems = adaptFeedItemsToContentItems(items, sources);
    return clusterContentItems(contentItems);
  }, [items, sources]);

  const newArticlesSinceLastVisit = useMemo(() => {
    if (!lastVisitTimestamp || items.length === 0) return 0;
    const lastVisitTime = new Date(lastVisitTimestamp).getTime();
    return items.filter((item) => new Date(item.publishedAt).getTime() > lastVisitTime).length;
  }, [items, lastVisitTimestamp]);

  const value = useMemo(
    () => ({
      items,
      sources,
      savedIDs,
      readIDs,
      seenTimestamps,
      savedItems,
      settings,
      clusters,
      sourceMeta,
      lastRefreshAt,
      lastVisitTimestamp,
      isLoading,
      isFirstLaunch,
      isRefreshing,
      errorMessage,
      lastRefreshSummary,
      newArticlesSinceLastVisit,
      searchQuery,
      setSearchQuery,
      refresh,
      clearCache,
      completeOnboarding,
      toggleSaved,
      toggleSource,
      updateSettings,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      muteSource
    }),
    [clearCache, clusters, completeOnboarding, errorMessage, isFirstLaunch, isLoading, isRefreshing, items, lastRefreshAt, lastRefreshSummary, lastVisitTimestamp, markAllAsRead, markAsRead, markAsUnread, muteSource, newArticlesSinceLastVisit, readIDs, refresh, savedIDs, savedItems, searchQuery, seenTimestamps, settings, sourceMeta, sources, toggleSaved, toggleSource, updateSettings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProvider");
  return context;
}
