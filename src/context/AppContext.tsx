import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import type { FeedItem, Source, StoryGroup, UserSettings } from "../domain/models";
import { refreshFeeds } from "../services/feedEngine";
import {
  loadCachedFeed,
  loadCheckpointDate,
  loadHasLaunchedBefore,
  loadReadIDs,
  loadSavedIDs,
  loadSettings,
  loadSources,
  saveCachedFeed,
  saveCheckpointDate,
  saveHasLaunchedBefore,
  saveReadIDs,
  saveSavedIDs,
  saveSettings,
  saveSources
} from "../services/storage";
import { groupFeedItems } from "../utils/grouping";
import { stripHTML } from "../utils/formatting";

interface AppContextValue {
  items: FeedItem[];
  sources: Source[];
  savedIDs: string[];
  readIDs: string[];
  savedItems: FeedItem[];
  settings: UserSettings | null;
  groups: StoryGroup[];
  isLoading: boolean;
  isFirstLaunch: boolean | null;
  isRefreshing: boolean;
  errorMessage: string | null;
  lastRefreshSummary: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  completeOnboarding: (sources: Source[], settings: UserSettings) => Promise<void>;
  toggleSaved: (itemID: string) => Promise<void>;
  toggleSource: (sourceID: string) => Promise<void>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  setCheckpointAtItem: (item: FeedItem) => Promise<void>;
  markAsRead: (itemID: string) => Promise<void>;
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
    return ` ${name} failed to refresh.`;
  }
  return ` ${failures.length} sources failed.`;
}

function refreshErrorMessage(failures: { sourceID: string; message: string }[]): string {
  if (failures.length === 0) return "Refresh returned no stories.";
  const firstFailure = failures[0];
  return failures.length === 1
    ? `Refresh failed for 1 source: ${firstFailure.message}`
    : `Refresh failed for ${failures.length} sources. First error: ${firstFailure.message}`;
}

function enforceCacheLimit(items: FeedItem[], windowDays: number, maxItems: number): FeedItem[] {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const saved = items.filter((item) => item.isSaved);
  const unsaved = items
    .filter((item) => !item.isSaved)
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
    .slice(0, maxItems);
  return [...unsaved, ...saved].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [savedIDs, setSavedIDs] = useState<string[]>([]);
  const [readIDs, setReadIDs] = useState<string[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshSummary, setLastRefreshSummary] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isRefreshingRef = useRef(false);
  const autoRefreshAttemptedRef = useRef(false);
  const isFirstLaunchRef = useRef(false);

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
        const { groups: partialGroups } = groupFeedItems(displayItems);
        setItems(displayItems);
        setGroups(partialGroups);
      };

      const result = await refreshFeeds(sources, savedIDs, checkpointDate, onProgress);
      const failureText = refreshFailureMessage(result.failures, sources);

      // On first-ever launch, restrict feed to the past 3 days so the initial
      // load isn't overwhelming. Subsequent launches get the full source output.
      let freshItems = result.items;
      if (isFirstLaunchRef.current) {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        freshItems = freshItems.filter((item) => new Date(item.publishedAt).getTime() >= threeDaysAgo);
      }

      // Apply cache window and item cap; saved items are always kept.
      if (settings) {
        freshItems = enforceCacheLimit(freshItems, settings.cacheWindowDays, settings.maxCachedItems);
      }

      const shouldKeepExistingFeed = freshItems.length === 0 && items.length > 0;

      if (!shouldKeepExistingFeed) {
        const readItems = mergeRead(freshItems, readIDs);
        // Only re-render the list if items actually changed. Identical result (no new
        // stories) should be a silent no-op so VoiceOver focus is never disrupted.
        const existingIDs = new Set(items.map((item) => item.id));
        const hasNewItems = readItems.some((item) => !existingIDs.has(item.id));
        if (hasNewItems || !hadItemsBefore) {
          const { groups: freshGroups } = groupFeedItems(readItems);
          setItems(readItems);
          setGroups(freshGroups);
        }
        await saveCachedFeed(readItems);
      }

      if (isFirstLaunchRef.current) {
        await saveHasLaunchedBefore();
        isFirstLaunchRef.current = false;
      }

      const existingIDs = new Set(items.map((item) => item.id));
      const newItemCount = freshItems.filter((item) => !existingIDs.has(item.id)).length;
      const summary = shouldKeepExistingFeed || newItemCount === 0
        ? `No new stories.${failureText}`
        : `${newItemCount} new ${newItemCount === 1 ? "story" : "stories"}.${failureText}`;
      setErrorMessage(freshItems.length === 0 ? refreshErrorMessage(result.failures) : null);
      setLastRefreshSummary(summary);
      AccessibilityInfo.announceForAccessibility(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh feeds.";
      setErrorMessage(message);
      AccessibilityInfo.announceForAccessibility(`Refresh failed. ${message}`);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [items, readIDs, savedIDs, settings, sources]);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      // Load sources, settings, and ids first (small/fast) so the UI can show immediately.
      const [loadedSources, loadedSavedIDs, loadedReadIDs, loadedSettings, hasLaunchedBefore] = await Promise.all([
        loadSources(),
        loadSavedIDs(),
        loadReadIDs(),
        loadSettings(),
        loadHasLaunchedBefore()
      ]);
      if (!mounted) return;
      isFirstLaunchRef.current = !hasLaunchedBefore;
      setIsFirstLaunch(!hasLaunchedBefore);
      setSources(loadedSources);
      setSavedIDs(loadedSavedIDs);
      setReadIDs(loadedReadIDs);
      setSettings(loadedSettings);
      setIsLoading(false);

      // Load the feed cache in the background — only populate if a network refresh
      // hasn't already provided items (avoids overwriting fresh data with stale cache).
      if (loadedSettings.offlineSavingEnabled) {
        const cachedFeed = await loadCachedFeed();
        if (!mounted) return;
        const cachedItems = mergeRead(mergeSaved(cachedFeed, loadedSavedIDs), loadedReadIDs);
        setItems((prev) => (prev.length > 0 ? prev : cachedItems));
        setGroups((prev) => (prev.length > 0 ? prev : groupFeedItems(cachedItems).groups));
      }
    }
    hydrate().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load Main Street Gazette data.");
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && settings?.autoRefreshOnLaunch && sources.length > 0 && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      refresh();
    }
  }, [isLoading, refresh, settings?.autoRefreshOnLaunch, sources.length]);

  // Keep a stable ref to the latest refresh so the interval never captures a stale closure
  // and doesn't need to reset the 60s countdown every time items update during streaming.
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    if (isLoading || isFirstLaunch || sources.length === 0) return;
    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        refreshRef.current();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [isLoading, isFirstLaunch, sources.length]);

  const toggleSaved = useCallback(
    async (itemID: string) => {
      const nextSaved = savedIDs.includes(itemID) ? savedIDs.filter((id) => id !== itemID) : [...savedIDs, itemID];
      const nextItems = mergeSaved(items, nextSaved);
      setSavedIDs(nextSaved);
      setItems(nextItems);
      await Promise.all([saveSavedIDs(nextSaved), saveCachedFeed(nextItems)]);
      AccessibilityInfo.announceForAccessibility(nextSaved.includes(itemID) ? "Article saved." : "Article removed from saved.");
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
        AccessibilityInfo.announceForAccessibility(`${source.name} ${source.isEnabled ? "enabled" : "disabled"}.`);
      }
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
  }, []);

  const setCheckpointAtItem = useCallback(
    async (item: FeedItem) => {
      await saveCheckpointDate(item.publishedAt);
      const itemTime = new Date(item.publishedAt).getTime();
      const nextItems = items.map((candidate) => ({
        ...candidate,
        isNewRelativeToCheckpoint: new Date(candidate.publishedAt).getTime() > itemTime
      }));
      setItems(nextItems);
      await saveCachedFeed(nextItems);
      AccessibilityInfo.announceForAccessibility("Checkpoint set.");
    },
    [items]
  );

  const markAsRead = useCallback(
    async (itemID: string) => {
      if (readIDs.includes(itemID)) return;
      const nextReadIDs = [...readIDs, itemID];
      const nextItems = items.map((item) => (item.id === itemID ? { ...item, isRead: true } : item));
      setReadIDs(nextReadIDs);
      setItems(nextItems);
      await Promise.all([saveReadIDs(nextReadIDs), saveCachedFeed(nextItems)]);
    },
    [items, readIDs]
  );

  const savedItems = useMemo(() => items.filter((item) => savedIDs.includes(item.id)), [items, savedIDs]);

  const value = useMemo(
    () => ({
      items,
      sources,
      savedIDs,
      readIDs,
      savedItems,
      settings,
      groups,
      isLoading,
      isFirstLaunch,
      isRefreshing,
      errorMessage,
      lastRefreshSummary,
      searchQuery,
      setSearchQuery,
      refresh,
      completeOnboarding,
      toggleSaved,
      toggleSource,
      updateSettings,
      setCheckpointAtItem,
      markAsRead
    }),
    [completeOnboarding, errorMessage, groups, isFirstLaunch, isLoading, isRefreshing, items, lastRefreshSummary, markAsRead, readIDs, refresh, savedIDs, savedItems, searchQuery, setCheckpointAtItem, settings, sources, toggleSaved, toggleSource, updateSettings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProvider");
  return context;
}
