import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import type { FeedItem, Source, StoryGroup, UserSettings } from "../domain/models";
import { refreshFeeds } from "../services/feedEngine";
import {
  loadCachedFeed,
  loadCheckpointDate,
  loadSavedIDs,
  loadSettings,
  loadSources,
  saveCachedFeed,
  saveCheckpointDate,
  saveSavedIDs,
  saveSettings,
  saveSources
} from "../services/storage";

interface AppContextValue {
  items: FeedItem[];
  sources: Source[];
  savedIDs: string[];
  savedItems: FeedItem[];
  settings: UserSettings | null;
  groups: StoryGroup[];
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  lastRefreshSummary: string | null;
  refresh: () => Promise<void>;
  toggleSaved: (itemID: string) => Promise<void>;
  toggleSource: (sourceID: string) => Promise<void>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  setCheckpointAtItem: (item: FeedItem) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function mergeSaved(items: FeedItem[], savedIDs: string[]): FeedItem[] {
  return items.map((item) => ({ ...item, isSaved: savedIDs.includes(item.id) }));
}

function refreshFailureMessage(failureCount: number): string {
  if (failureCount === 0) return "";
  return failureCount === 1 ? " 1 source failed." : ` ${failureCount} sources failed.`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [savedIDs, setSavedIDs] = useState<string[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshSummary, setLastRefreshSummary] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);
  const autoRefreshAttemptedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const checkpointDate = await loadCheckpointDate();
      const result = await refreshFeeds(sources, savedIDs, checkpointDate);
      const failureText = refreshFailureMessage(result.failures.length);
      const shouldKeepExistingFeed = result.items.length === 0 && result.failures.length > 0;

      if (!shouldKeepExistingFeed) {
        setItems(result.items);
        setGroups(result.groups);
        await saveCachedFeed(result.items);
      }

      const summary = shouldKeepExistingFeed
        ? `Refresh found no new items and kept your current feed.${failureText}`
        : `Refreshed ${result.fetchedItemCount} items from ${result.fetchedSourceCount} sources.${failureText}`;
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
  }, [savedIDs, sources]);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [loadedSources, cachedFeed, loadedSavedIDs, loadedSettings] = await Promise.all([
        loadSources(),
        loadCachedFeed(),
        loadSavedIDs(),
        loadSettings()
      ]);
      if (!mounted) return;
      setSources(loadedSources);
      setSavedIDs(loadedSavedIDs);
      setItems(mergeSaved(cachedFeed, loadedSavedIDs));
      setSettings(loadedSettings);
      setIsLoading(false);
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
    if (!isLoading && settings?.autoRefreshOnLaunch && sources.length > 0 && items.length === 0 && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      refresh();
    }
  }, [isLoading, items.length, refresh, settings?.autoRefreshOnLaunch, sources.length]);

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

  const savedItems = useMemo(() => items.filter((item) => savedIDs.includes(item.id)), [items, savedIDs]);

  const value = useMemo(
    () => ({
      items,
      sources,
      savedIDs,
      savedItems,
      settings,
      groups,
      isLoading,
      isRefreshing,
      errorMessage,
      lastRefreshSummary,
      refresh,
      toggleSaved,
      toggleSource,
      updateSettings,
      setCheckpointAtItem
    }),
    [errorMessage, groups, isLoading, isRefreshing, items, lastRefreshSummary, refresh, savedIDs, savedItems, setCheckpointAtItem, settings, sources, toggleSaved, toggleSource, updateSettings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProvider");
  return context;
}
