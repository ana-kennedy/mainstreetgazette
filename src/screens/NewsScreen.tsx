import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActionSheetIOS,
  Alert,
  AppState,
  FlatList,
  findNodeHandle,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MsgHeaderBanner } from "../components/MsgHeaderBanner";
import { SettingsGearButton } from "../components/GazettePageHeader";
import { EditorsNote } from "../components/EditorsNote";
import { AdaptiveSection } from "../components/AdaptiveSection";
import { ActivityIndicator, Banner, Button, IconButton, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { EmptyState } from "../components/EmptyState";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { FeedItemCard } from "../components/FeedItemCard";
import { StoryClusterCard } from "../components/StoryClusterCard";
import { TIMELINE_WINDOW_HOURS } from "../components/LocationFilter";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import { usePlayback } from "../context/PlaybackContext";
import { useToast } from "../context/ToastContext";
import type { ContentType, FeedItem, LocationFilterKey, ParkFilterKey, TimelineWindow } from "../domain/models";
import type { StoryCluster } from "../types/storyTypes";
import { INTERNATIONAL_LOCATION_IDS } from "../services/knowledgeMatcher";
import { searchFeedItems } from "../utils/search";
import { loadScrollPosition, saveScrollPosition, saveLastSelectedID } from "../services/storage";
import { useFocusRestore } from "../hooks/useFocusRestore";
import { usePersonalization } from "../context/PersonalizationContext";
import { rankPersonalizedStories, personalizeStory, describeMatchedFavoriteLabels } from "../personalization/personalizationEngine";
import { clusterToStoryClusterLike, feedItemToStoryClusterLike } from "../personalization/clusterAdapter";
import { PARK_OPTIONS } from "./NewsPreferencesScreen";
import topicTaxonomyData from "../assets/data/knowledge/topic_taxonomy_v1.json";
import { SearchFilterBar } from "../components/SearchFilterBar";
import type { SearchFilterChip } from "../components/SearchFilterBar";
import { SearchResultRow } from "../components/SearchResultRow";
import { searchMainStreetGazette } from "../search/searchEngine";
import { feedItemToSearchableItem, storyClusterToSearchableItem } from "../search/searchAdapter";
import type { SearchQuickFilter, SearchResult } from "../search/searchTypes";
import {
  timelineFilterToContentScope,
  type ContentScope,
} from "../utils/contentFilters";

function getTimeGreeting(t: TFunction, name?: string): string {
  const hour = new Date().getHours();
  let key: string;
  if (hour >= 5 && hour < 12) key = "morning";
  else if (hour >= 12 && hour < 17) key = "afternoon";
  else if (hour >= 17 && hour < 21) key = "evening";
  else key = "night";
  return name ? t(`greeting.${key}_name`, { name }) : t(`greeting.${key}`);
}

type Filter = "all" | ContentType | "social";
type DisplayMode = "full" | "minimal";

const PAGE_SIZE = 10;

const SEARCH_FILTER_CHIPS: SearchFilterChip[] = [
  { id: "all", label: "All" },
  { id: "stories", label: "Stories" },
  { id: "article", label: "Articles" },
  { id: "video", label: "Videos" },
  { id: "podcast", label: "Podcasts" },
  { id: "community", label: "Community" },
  { id: "official", label: "Official" },
];

export interface NewsScreenCoreProps {
  mode: "today" | "allUnread";
  onNavigateToDetail: (item: FeedItem) => void;
  onNavigateToPlayer: () => void;
  onNavigateToStoryDetail: (clusterId: string) => void;
  onOpenPreferences: () => void;
  onOpenFavoritesSetup: () => void;
}

export function NewsScreenCore({ mode, onNavigateToDetail, onNavigateToPlayer, onNavigateToStoryDetail, onOpenPreferences, onOpenFavoritesSetup }: NewsScreenCoreProps) {
  const app = useAppContext();
  const { playRefreshStart } = useSounds();
  const { playItem, addToQueue, isLoading: isPodcastBuffering } = usePlayback();
  const { showToast } = useToast();
  const theme = useTheme();
  const { t } = useTranslation();
  const { prefs: personalizationPrefs, setNewsFeedMode } = usePersonalization();
  const { width: screenWidth } = useWindowDimensions();
  const filter: Filter = app.settings?.timelineContentFilter ?? "all";
  const displayMode: DisplayMode = app.settings?.timelineDisplayMode ?? "full";
  const parkFilter: ParkFilterKey = app.settings?.parkFilter ?? "all";
  const parkFilterActive = parkFilter !== "all";
  const effectiveFilter: Filter = parkFilterActive ? "article" : filter;
  const selectedContentScope: ContentScope =
    personalizationPrefs.newsFeedMode === "official" ? "official" : timelineFilterToContentScope(filter);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const screenReaderOptimized = Boolean(app.settings?.simplifiedLayoutEnabled) || isScreenReaderEnabled;
  const locationFilter: LocationFilterKey = app.settings?.locationFilter ?? "all";
  const sourceFilter: string | null = app.settings?.sourceFilter ?? null;
  const timelineWindow: TimelineWindow = app.settings?.timelineWindow ?? "all";

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingFocusItemID, setPendingFocusItemID] = useState<string | null>(null);
  const [pendingScrollItemID, setPendingScrollItemID] = useState<string | null>(null);
  const [selectedSearchFilter, setSelectedSearchFilter] = useState<SearchQuickFilter>("all");

  const listRef = useRef<FlatList<FeedItem>>(null);
  const itemRefs = useRef<Record<string, View | null>>({});
  const { save: saveFocusTarget } = useFocusRestore();

  // Tracks the last article the user opened — used to anchor scroll after refresh and on reopen
  const lastSelectedIDRef = useRef<string | null>(null);

  // Infinite scroll + position tracking refs
  const firstVisibleIDRef = useRef<string | null>(null);
  const scrollOffsetRef = useRef(0);
  const pendingScrollOffsetRef = useRef<number | null>(null);
  const hasMoreItemsRef = useRef(false);
  const visibleItemsRef = useRef<FeedItem[]>([]);
  const lastDisplayedIDRef = useRef<string | null>(null);
  const pendingRestoreIDRef = useRef<string | null>(null);
  const pendingRestorePublishedAtRef = useRef<string | null>(null);
  const preRefreshItemIDsRef = useRef<Set<string> | null>(null);
  const wasRefreshingRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 30 }).current;

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsScreenReaderEnabled)
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setIsScreenReaderEnabled,
    );

    return () => subscription.remove();
  }, []);

  const handleJumpToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    AccessibilityInfo.announceForAccessibility(t("home.announce.jumpedTop"));
  };

  const handleJumpToMarker = () => {
    const markerIndex = visibleItems.findIndex((item) => !item.isNewRelativeToCheckpoint);
    if (markerIndex === -1) {
      AccessibilityInfo.announceForAccessibility(t("home.announce.noMarker"));
      return;
    }
    if (markerIndex < displayedItems.length) {
      listRef.current?.scrollToIndex({ index: markerIndex, animated: true, viewPosition: 0 });
      setTimeout(() => {
        const node = findNodeHandle(itemRefs.current[visibleItems[markerIndex].id]);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }, 400);
    } else {
      const targetItem = visibleItems[markerIndex];
      setPendingFocusItemID(targetItem.id);
      setVisibleCount(markerIndex + PAGE_SIZE);
    }
    AccessibilityInfo.announceForAccessibility(t("home.announce.jumpedMarker"));
  };

  const handleFindInTimeline = () => {
    const nextVisible = !isSearchVisible;
    setIsSearchVisible(nextVisible);
    if (!nextVisible) {
      app.setSearchQuery("");
      setSelectedSearchFilter("all");
    } else {
      AccessibilityInfo.announceForAccessibility(t("home.announce.searchShown"));
    }
  };

  const handleRefresh = () => {
    playRefreshStart();
    preRefreshItemIDsRef.current = new Set(app.items.map((i) => i.id));
    AccessibilityInfo.announceForAccessibility(t("home.announce.refreshing"));
    app.refresh().catch(() => {});
  };

  // Only announces for a refresh the user actually triggered (this ref is only set in
  // handleRefresh above) — silent background/auto-refreshes shouldn't interrupt someone reading.
  useEffect(() => {
    if (wasRefreshingRef.current && !app.isRefreshing && preRefreshItemIDsRef.current) {
      const beforeIDs = preRefreshItemIDsRef.current;
      const newCount = app.items.filter((item) => !beforeIDs.has(item.id)).length;
      preRefreshItemIDsRef.current = null;
      AccessibilityInfo.announceForAccessibility(
        newCount === 0
          ? t("home.announce.refreshedNoNew")
          : newCount === 1
            ? t("home.announce.refreshedNew_one", { count: newCount })
            : t("home.announce.refreshedNew_other", { count: newCount })
      );
    }
    wasRefreshingRef.current = app.isRefreshing;
  }, [app.isRefreshing, app.items, t]);

  // Region + followed-source scope picker — replaces the old separate LocationFilter bar,
  // PersonalizedNewsFilterBar, and park-filter menu item with one unified control.
  const locationLabels: Record<LocationFilterKey, string> = {
    all: t("knowledge.location.all"),
    wdw: t("knowledge.location.wdw"),
    dlr: t("knowledge.location.dlr"),
    dcl: t("knowledge.location.dcl"),
    international: t("knowledge.location.international"),
  };

  // Name lookups for the "why recommended" caption — maps favorite IDs back to display labels.
  const favoriteNameMaps = useMemo(() => {
    const parks: Record<string, string> = {};
    for (const option of PARK_OPTIONS) parks[option.value] = option.label;
    const topics: Record<string, string> = {};
    for (const topic of topicTaxonomyData.topics) topics[topic.id] = topic.name;
    return { locations: locationLabels, parks, topics };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Today's Gazette / My Magic / All Headlines — the single "current edition" view button.
  // Replaces the old region+source+favorites scope picker: region/source narrowing moved to
  // Settings > News & Timeline (NewsPreferencesScreen already has a location control there);
  // "follow one specific source" had no other home, so that capability is intentionally
  // dropped from the primary feed in favor of browsing a source directly via Source Library —
  // see PHASE_02_RESULTS.md for the full rationale.
  type NewsView = "today" | "mine" | "all";
  const NEWS_VIEW_ORDER: NewsView[] = ["today", "mine", "all"];
  const [newsView, setNewsView] = useState<NewsView>(
    personalizationPrefs.newsFeedMode === "favorites" ? "mine" : "today"
  );

  // "All Headlines" bypasses story grouping for this view only — a local override, not a
  // persisted setting, so the user's Settings > News preference for grouping is left alone.
  const effectiveGroupStories = newsView === "all" ? false : Boolean(app.settings?.groupStoriesEnabled);

  const handleChangeView = (view: NewsView) => {
    setNewsView(view);
    setNewsFeedMode(view === "mine" ? "favorites" : "all");
    if (app.settings) {
      app.updateSettings({ ...app.settings, locationFilter: "all", sourceFilter: null });
    }
    AccessibilityInfo.announceForAccessibility(t("home.view.announce", { view: t(`home.view.${view}`) }));
  };

  const handleOpenViewMenu = () => {
    const options = NEWS_VIEW_ORDER.map((view) => ({ view, label: t(`home.view.${view}`) }));
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((o) => o.label), t("common.dismiss")],
          cancelButtonIndex: options.length,
        },
        (index) => {
          if (index < options.length) handleChangeView(options[index].view);
        }
      );
    } else {
      Alert.alert(t("home.view.menuTitle"), undefined, [
        ...options.map((o) => ({ text: o.label, onPress: () => handleChangeView(o.view) })),
        { text: t("common.dismiss"), style: "cancel" as const },
      ]);
    }
  };

  const handleMarkAllAsRead = async () => {
    const count = await app.markAllAsRead();
    if (count > 0) {
      const msg = count === 1
        ? t("home.announce.markedAllRead_one", { count })
        : t("home.announce.markedAllRead_other", { count });
      showToast(msg, "success");
      AccessibilityInfo.announceForAccessibility(msg);
    }
  };

  const handleCustomizeFeed = () => {
    onOpenPreferences();
  };

  // Rarely-used list actions (mark all read / jump to marker / jump to top) — tucked behind
  // one overflow control instead of living permanently on the header.
  const handleOpenMoreActions = () => {
    const actions = [
      { label: t("home.menu.markAllRead"), onPress: handleMarkAllAsRead },
      { label: t("home.menu.jumpToMarker"), onPress: handleJumpToMarker },
      { label: t("home.menu.jumpToTop"), onPress: handleJumpToTop },
    ];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((a) => a.label), t("common.dismiss")],
          cancelButtonIndex: actions.length,
        },
        (index) => {
          if (index < actions.length) actions[index].onPress();
        }
      );
    } else {
      Alert.alert(
        t("home.menu.moreActions"),
        undefined,
        [
          ...actions.map((a) => ({ text: a.label, onPress: a.onPress })),
          { text: t("common.dismiss"), style: "cancel" as const },
        ]
      );
    }
  };

  useEffect(() => {
    // "personalized" and "latest" have no setup UI yet — reset those. "favorites" is
    // now selectable from the scope picker below, backed by the Favorites preferences
    // set up in Settings > My Disney Interests.
    if (personalizationPrefs.newsFeedMode === "personalized" || personalizationPrefs.newsFeedMode === "latest") {
      setNewsFeedMode("all");
    }
  }, [personalizationPrefs.newsFeedMode, setNewsFeedMode]);

  // Filter base items by mode before applying user filters
  const baseItems = useMemo(() => {
    if (mode === "today") {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return app.items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
    }
    return app.items;
  }, [app.items, mode]);

  // Build lookup structures for story clusters so renderFeedItem can show cluster cards
  const clusterByPrimaryItemID = useMemo(() => {
    const map = new Map<string, StoryCluster>();
    for (const cluster of app.clusters) {
      map.set(cluster.primaryItemId, cluster);
    }
    return map;
  }, [app.clusters]);

  const allNonPrimaryClusterItemIDs = useMemo(() => {
    const nonPrimary = new Set<string>();
    for (const cluster of app.clusters) {
      for (const ci of cluster.items) {
        if (ci.itemId !== cluster.primaryItemId) {
          nonPrimary.add(ci.itemId);
        }
      }
    }
    return nonPrimary;
  }, [app.clusters]);

  // Maps any cluster member ID to that cluster's current primary item ID. Used to re-find a
  // scroll/focus anchor that got reclustered out of the visible list (its story didn't disappear,
  // it just changed which member represents it) instead of losing the reader's place entirely.
  const primaryIDForMemberID = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of app.clusters) {
      for (const ci of cluster.items) {
        map.set(ci.itemId, cluster.primaryItemId);
      }
    }
    return map;
  }, [app.clusters]);

  // Resolves a saved/tracked anchor item ID against the current visible list: exact match first,
  // then its cluster's current primary (if it got reclustered), then the chronologically nearest
  // still-visible item (if the item aged out of the cache entirely and anchorPublishedAt is known).
  const resolveAnchorID = useCallback(
    (anchorID: string | null, anchorPublishedAt?: string | null): string | null => {
      if (!anchorID) return null;
      const items = visibleItemsRef.current;
      if (items.some((item) => item.id === anchorID)) return anchorID;

      const primaryID = primaryIDForMemberID.get(anchorID);
      if (primaryID && items.some((item) => item.id === primaryID)) return primaryID;

      if (anchorPublishedAt && items.length > 0) {
        const targetTime = new Date(anchorPublishedAt).getTime();
        let nearest = items[0];
        let nearestDelta = Math.abs(new Date(nearest.publishedAt).getTime() - targetTime);
        for (const item of items) {
          const delta = Math.abs(new Date(item.publishedAt).getTime() - targetTime);
          if (delta < nearestDelta) {
            nearest = item;
            nearestDelta = delta;
          }
        }
        return nearest.id;
      }

      return null;
    },
    [primaryIDForMemberID]
  );

  const officialSourceIDs = useMemo(
    () =>
      new Set(
        app.sources
          .filter(
            (source) =>
              source.trustLabel === "official" ||
              source.officialStatus === "Official" ||
              source.categoryTags.includes("official")
          )
          .map((source) => source.id)
      ),
    [app.sources]
  );

  // Personalization — apply personalization scoring / filtering to cluster ordering
  const personalizationOrderedPrimaryIDs = useMemo<string[] | null>(() => {
    if (!effectiveGroupStories) return null;
    const mode = personalizationPrefs.newsFeedMode;

    const clusterMap = new Map(app.clusters.map((c) => [c.clusterId, c.primaryItemId]));

    let filteredClusters = app.clusters;

    if (mode === "favorites") {
      filteredClusters = app.clusters.filter((c) => {
        const like = clusterToStoryClusterLike(c);
        const result = personalizeStory(like, personalizationPrefs);
        return !result.hidden && result.matchedFavorites.length > 0;
      });
    } else if (mode === "official") {
      filteredClusters = app.clusters.filter((c) => c.officialSourcePresent);
    } else if (mode === "articles") {
      filteredClusters = app.clusters.filter((c) => c.articleCount > 0);
    } else if (mode === "videos") {
      filteredClusters = app.clusters.filter((c) => c.videoCount > 0);
    } else if (mode === "podcasts") {
      filteredClusters = app.clusters.filter((c) => c.podcastCount > 0);
    } else if (mode === "community") {
      filteredClusters = app.clusters.filter((c) => c.communityCount > 0);
    } else if (mode === "latest" || mode === "all") {
      // all/latest: default chronological order — return null to use existing timeline sort
      return null;
    }

    if (mode === "personalized") {
      const storyClusterLikes = filteredClusters.map(clusterToStoryClusterLike);
      const ranked = rankPersonalizedStories(storyClusterLikes, personalizationPrefs);
      return ranked
        .map((s) => clusterMap.get(s.id))
        .filter((id): id is string => id != null);
    }

    // For all other modes (favorites, official, articles, videos, podcasts, community):
    // sort by lastPublishedAt descending
    return [...filteredClusters]
      .sort((a, b) => new Date(b.lastPublishedAt).getTime() - new Date(a.lastPublishedAt).getTime())
      .map((c) => clusterMap.get(c.clusterId))
      .filter((id): id is string => id != null);
  }, [effectiveGroupStories, app.clusters, personalizationPrefs]);

  // Search engine — build index from story clusters + feed items, then rank
  const sourceByIDMap = useMemo(
    () => new Map(app.sources.map((s) => [s.id, s])),
    [app.sources]
  );

  const itemByIDMap = useMemo(
    () => new Map(app.items.map((i) => [i.id, i])),
    [app.items]
  );

  const searchableItems = useMemo(() => {
    if (!isSearchVisible) return [];
    const clusterItems = app.clusters.map(storyClusterToSearchableItem);
    const feedItems = app.items.map((item) =>
      feedItemToSearchableItem(item, sourceByIDMap.get(item.sourceID))
    );
    return [...clusterItems, ...feedItems];
  }, [isSearchVisible, app.clusters, app.items, sourceByIDMap]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = app.searchQuery.trim();
    if (!query || !isSearchVisible) return [];
    return searchMainStreetGazette(query, searchableItems, {
      quickFilter: selectedSearchFilter,
      limit: 80,
    });
  }, [app.searchQuery, isSearchVisible, searchableItems, selectedSearchFilter]);

  const isSearchActive = isSearchVisible && app.searchQuery.trim().length > 0;

  const visibleItems = useMemo(() => {
    const newFiltered = app.settings?.showOnlyNew
      ? baseItems.filter((item) => item.isNewRelativeToCheckpoint)
      : baseItems;
    const sinceLastVisitFiltered =
      app.settings?.showSinceLastVisit && app.lastVisitTimestamp
        ? newFiltered.filter((item) => new Date(item.publishedAt).getTime() > new Date(app.lastVisitTimestamp!).getTime())
        : newFiltered;
    const typeFiltered =
      effectiveFilter === "all"
        ? sinceLastVisitFiltered
        : effectiveFilter === "social"
          // "social" filter now matches community contentType (reddit/forum)
          ? sinceLastVisitFiltered.filter((item) => item.contentType === "community")
          : sinceLastVisitFiltered.filter((item) => item.contentType === effectiveFilter);
    const officialFiltered =
      selectedContentScope === "official"
        ? typeFiltered.filter(
            (item) => item.trustLabel === "official" || officialSourceIDs.has(item.sourceID)
          )
        : typeFiltered;
    const parkFiltered =
      parkFilter === "all"
        ? officialFiltered
        : officialFiltered.filter((item) => item.tags.includes(`park:${parkFilter}`));

    // Location filter: uses primaryLocationId from Phase 2 enrichment
    const locationFiltered =
      locationFilter === "all"
        ? parkFiltered
        : locationFilter === "international"
          ? parkFiltered.filter((item) =>
              item.primaryLocationId != null &&
              INTERNATIONAL_LOCATION_IDS.has(item.primaryLocationId)
            )
          : parkFiltered.filter((item) => item.primaryLocationId === locationFilter);

    // Source filter: the unified scope picker's "followed source" selection
    const sourceScopedFiltered = sourceFilter
      ? locationFiltered.filter((item) => item.sourceID === sourceFilter)
      : locationFiltered;

    // Timeline window: filter by max age in hours
    const windowHours = TIMELINE_WINDOW_HOURS[timelineWindow];
    const windowFiltered =
      windowHours == null
        ? sourceScopedFiltered
        : sourceScopedFiltered.filter(
            (item) =>
              Date.now() - new Date(item.publishedAt).getTime() <= windowHours * 60 * 60 * 1000
          );

    const searched = searchFeedItems(windowFiltered, app.searchQuery);
    const sorted = [...searched].sort((lhs, rhs) => {
      const delta = new Date(rhs.publishedAt).getTime() - new Date(lhs.publishedAt).getTime();
      return app.settings?.sortOrder === "oldestFirst" ? -delta : delta;
    });

    // When grouping is enabled, use personalization or timeline ordering.
    // Personalization takes precedence; falls back to timeline for "latest" mode.
    // Non-primary cluster items are hidden; user accesses them via StoryDetailScreen.
    if (effectiveGroupStories) {
      const nonPrimary = sorted.filter((item) => !allNonPrimaryClusterItemIDs.has(item.id));
      const orderedIDs = personalizationOrderedPrimaryIDs;
      if (orderedIDs) {
        const idSet = new Set(orderedIDs);
        const idOrder = new Map<string, number>(
          orderedIDs.map((id, i) => [id, i] as [string, number])
        );
        return nonPrimary
          .filter((item) => idSet.has(item.id))
          .sort((a, b) => (idOrder.get(a.id) ?? 9999) - (idOrder.get(b.id) ?? 9999));
      }
      return nonPrimary;
    }
    // Group Stories is off — there's no StoryCluster to filter through, so Favorites mode
    // (the one mode with no other item-level equivalent) is applied directly to individual
    // items here instead of silently doing nothing.
    if (personalizationPrefs.newsFeedMode === "favorites") {
      return sorted.filter((item) => {
        const like = feedItemToStoryClusterLike(item);
        const result = personalizeStory(like, personalizationPrefs);
        return !result.hidden && result.matchedFavorites.length > 0;
      });
    }
    return sorted;
  }, [baseItems, app.searchQuery, app.settings?.showOnlyNew, app.settings?.showSinceLastVisit, app.settings?.sortOrder, effectiveGroupStories, app.lastVisitTimestamp, effectiveFilter, selectedContentScope, officialSourceIDs, parkFilter, locationFilter, sourceFilter, timelineWindow, allNonPrimaryClusterItemIDs, personalizationOrderedPrimaryIDs, personalizationPrefs]);

  const displayedItems = useMemo(() => visibleItems.slice(0, visibleCount), [visibleCount, visibleItems]);
  const hasMoreItems = displayedItems.length < visibleItems.length;

  // Keep mutable refs current so stable callbacks can read latest values
  hasMoreItemsRef.current = hasMoreItems;
  visibleItemsRef.current = visibleItems;
  lastDisplayedIDRef.current = displayedItems[displayedItems.length - 1]?.id ?? null;
  const isOnlyNewEmpty = Boolean(app.settings?.showOnlyNew && baseItems.length > 0 && visibleItems.length === 0);
  const isFavoritesEmpty = Boolean(
    personalizationPrefs.newsFeedMode === "favorites" &&
    !isOnlyNewEmpty &&
    baseItems.length > 0 &&
    visibleItems.length === 0
  );

  const sourceByID = useMemo(
    () => new Map(app.sources.map((s) => [s.id, s.name])),
    [app.sources]
  );

  const handleOpenItem = useCallback(
    (selected: FeedItem) => {
      lastSelectedIDRef.current = selected.id;
      saveLastSelectedID(selected.id).catch(() => {});
      saveFocusTarget(itemRefs.current[selected.id] ?? null);
      onNavigateToDetail(selected);
    },
    [onNavigateToDetail, saveFocusTarget]
  );

  const handleOpenCluster = useCallback(
    (cluster: StoryCluster) => {
      lastSelectedIDRef.current = cluster.primaryItemId;
      saveLastSelectedID(cluster.primaryItemId).catch(() => {});
      saveFocusTarget(itemRefs.current[cluster.primaryItemId] ?? null);
      onNavigateToStoryDetail(cluster.clusterId);
    },
    [onNavigateToStoryDetail, saveFocusTarget]
  );

  const handleSearchResultPress = useCallback(
    (result: SearchResult) => {
      if (result.resultType === "story") {
        onNavigateToStoryDetail(result.id);
      } else if (result.resultType === "contentItem") {
        const item = itemByIDMap.get(result.id);
        if (item) handleOpenItem(item);
      }
    },
    [onNavigateToStoryDetail, itemByIDMap, handleOpenItem]
  );

  const showWhyRecommended =
    personalizationPrefs.newsFeedMode === "favorites" &&
    personalizationPrefs.accessibility.announceWhyRecommended;

  const getWhyRecommended = useCallback(
    (like: ReturnType<typeof feedItemToStoryClusterLike>): string | undefined => {
      if (!showWhyRecommended) return undefined;
      const labels = describeMatchedFavoriteLabels(like, personalizationPrefs, favoriteNameMaps);
      return labels.length > 0 ? t("home.scope.becauseYouFollow", { labels: labels.join(", ") }) : undefined;
    },
    [showWhyRecommended, personalizationPrefs, favoriteNameMaps, t]
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem; index: number }) => {
      const cluster = clusterByPrimaryItemID.get(item.id);
      const isClusterPrimary = effectiveGroupStories && cluster && cluster.sourceCount > 1;
      const card = isClusterPrimary && cluster ? (
          <StoryClusterCard
            focusRef={(node) => { itemRefs.current[item.id] = node; }}
            cluster={cluster}
            primaryItem={item}
            settings={app.settings}
            onOpen={handleOpenCluster}
            onToggleSaved={app.toggleSaved}
            whyRecommended={getWhyRecommended(clusterToStoryClusterLike(cluster))}
          />
        ) : (
        <FeedItemCard
          focusRef={(node) => {
            itemRefs.current[item.id] = node;
          }}
          item={item}
          settings={app.settings}
          displayMode={displayMode}
          sourceName={sourceByID.get(item.sourceID) ?? "Unknown website"}
          onOpen={handleOpenItem}
          onPlay={playItem}
          onQueue={addToQueue}
          onToggleSaved={app.toggleSaved}
          onMarkRead={app.markAsRead}
          onMarkUnread={app.markAsUnread}
          onMuteSource={app.muteSource}
          whyRecommended={getWhyRecommended(feedItemToStoryClusterLike(item))}
        />
      );

      return card;
    },
    [
      app.settings,
      app.toggleSaved,
      app.markAsRead,
      app.markAsUnread,
      app.muteSource,
      effectiveGroupStories,
      handleOpenItem,
      handleOpenCluster,
      playItem,
      addToQueue,
      sourceByID,
      clusterByPrimaryItemID,
      getWhyRecommended,
    ]
  );

  const showAllItems = () => {
    if (app.settings) {
      app.updateSettings({ ...app.settings, showOnlyNew: false });
    }
  };

  useEffect(() => {
    // firstVisibleIDRef tracks the visible scroll position continuously via onViewableItemsChanged
    const rawAnchorID = firstVisibleIDRef.current ?? lastSelectedIDRef.current;
    const anchorID = resolveAnchorID(rawAnchorID);
    if (anchorID) {
      const idx = visibleItemsRef.current.findIndex((item) => item.id === anchorID);
      if (idx !== -1) {
        const neededCount = Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE;
        setVisibleCount(neededCount);
        pendingScrollOffsetRef.current = null; // re-anchor on filter/sort change, not a restore
        setPendingScrollItemID(anchorID);
        setPendingFocusItemID(null);
        return;
      }
    }
    setVisibleCount(PAGE_SIZE);
    setPendingFocusItemID(null);
  }, [app.items.length, app.searchQuery, app.settings?.showOnlyNew, app.settings?.showSinceLastVisit, app.settings?.sortOrder, app.settings?.timelineContentFilter, app.settings?.parkFilter, app.settings?.locationFilter, app.settings?.sourceFilter, app.settings?.timelineWindow, resolveAnchorID]);

  useEffect(() => {
    if (!pendingFocusItemID) return;
    const nextItemIndex = displayedItems.findIndex((item) => item.id === pendingFocusItemID);
    if (nextItemIndex === -1) return;
    listRef.current?.scrollToIndex({ index: nextItemIndex, animated: false, viewPosition: 0 });
    // Longer delay so VoiceOver has time to settle after app reopen before we redirect its focus
    const focusTimeout = setTimeout(() => {
      const node = findNodeHandle(itemRefs.current[pendingFocusItemID]);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
        setPendingFocusItemID(null);
      }
    }, 700);
    return () => clearTimeout(focusTimeout);
  }, [displayedItems, pendingFocusItemID]);

  // Scroll to anchor item — uses exact pixel offset for restores, index-based for re-anchors
  useEffect(() => {
    if (!pendingScrollItemID) return;
    const idx = displayedItems.findIndex((item) => item.id === pendingScrollItemID);
    if (idx === -1) return;
    const savedOffset = pendingScrollOffsetRef.current;
    if (savedOffset !== null) {
      listRef.current?.scrollToOffset({ offset: savedOffset, animated: false });
      pendingScrollOffsetRef.current = null;
    } else {
      listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.15 });
    }
    setPendingScrollItemID(null);
  }, [displayedItems, pendingScrollItemID]);

  // Silently expand the displayed list — no focus jump (used by infinite scroll)
  const expandItems = useCallback(() => {
    if (!hasMoreItemsRef.current) return;
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, visibleItemsRef.current.length));
  }, []);

  // Stable onEndReached — fires when scroll is within 50% of list height from bottom
  const onEndReached = useCallback(() => {
    expandItems();
  }, [expandItems]);

  const onScroll = useCallback(({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollOffsetRef.current = nativeEvent.contentOffset.y;
  }, []);

  // Stable onViewableItemsChanged — tracks first visible item for position saving,
  // and pre-loads when the last rendered item scrolls into view (belt + suspenders for VoiceOver)
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((vi) => vi.isViewable);
    if (first?.item) {
      firstVisibleIDRef.current = (first.item as FeedItem).id;
    }
    if (
      hasMoreItemsRef.current &&
      lastDisplayedIDRef.current &&
      viewableItems.some((vi) => vi.isViewable && (vi.item as FeedItem | undefined)?.id === lastDisplayedIDRef.current)
    ) {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, visibleItemsRef.current.length));
    }
  }, []);

  // Persist current position when app backgrounds — saves exact pixel offset + anchor item ID,
  // plus its publish date so we can still find a close position if the item itself later
  // disappears from the cache (e.g. aged out, or reclustered under a different primary).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        const anchorID = firstVisibleIDRef.current ?? lastSelectedIDRef.current;
        const anchorItem = anchorID ? itemByIDMap.get(anchorID) : undefined;
        saveScrollPosition(mode, {
          itemID: anchorID,
          offset: scrollOffsetRef.current,
          publishedAt: anchorItem?.publishedAt ?? null,
        }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [mode, itemByIDMap]);

  // Restore scroll position once items are available after app reopen (offset already set on mount)
  useEffect(() => {
    if (hasRestoredRef.current || !pendingRestoreIDRef.current || visibleItemsRef.current.length === 0) return;
    const savedID = resolveAnchorID(pendingRestoreIDRef.current, pendingRestorePublishedAtRef.current);
    if (!savedID) {
      pendingRestoreIDRef.current = null;
      pendingRestorePublishedAtRef.current = null;
      pendingScrollOffsetRef.current = null;
      return;
    }
    const idx = visibleItemsRef.current.findIndex((item) => item.id === savedID);
    if (idx === -1) return;
    hasRestoredRef.current = true;
    pendingRestoreIDRef.current = null;
    pendingRestorePublishedAtRef.current = null;
    const neededCount = Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE;
    setVisibleCount((c) => Math.max(c, neededCount));
    setPendingScrollItemID(savedID);
  }, [app.items.length, resolveAnchorID]);

  // Load saved position on mount. On iOS, items often load from cache before AsyncStorage resolves,
  // so we restore immediately if items are already available rather than waiting for app.items.length
  // to change (which may never happen again in that session).
  useEffect(() => {
    loadScrollPosition(mode).then((saved) => {
      if (!saved?.itemID) return;
      lastSelectedIDRef.current = saved.itemID;
      pendingScrollOffsetRef.current = saved.offset;
      if (!hasRestoredRef.current && visibleItemsRef.current.length > 0) {
        const resolvedID = resolveAnchorID(saved.itemID, saved.publishedAt);
        const idx = resolvedID ? visibleItemsRef.current.findIndex((item) => item.id === resolvedID) : -1;
        if (idx !== -1 && resolvedID) {
          hasRestoredRef.current = true;
          const neededCount = Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE;
          setVisibleCount((c) => Math.max(c, neededCount));
          setPendingScrollItemID(resolvedID);
        }
      } else {
        pendingRestoreIDRef.current = saved.itemID;
        pendingRestorePublishedAtRef.current = saved.publishedAt ?? null;
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // VoiceOver's linear swipe navigation is built from a tree snapshot taken when the screen first
  // appears. If the list is still empty at that moment (items loading from cache) and articles
  // mount a moment later, VoiceOver doesn't automatically notice — swiping right from the header
  // dead-ends, even though the articles are really there (touch-exploring finds them fine, since
  // that forces a fresh hit-test). Nudging focus onto the first article once, only when there's no
  // saved position to restore to, forces VoiceOver to rebuild its tree from that point.
  const hasDoneInitialA11yNudgeRef = useRef(false);
  useEffect(() => {
    if (hasDoneInitialA11yNudgeRef.current || !isScreenReaderEnabled) return;
    if (displayedItems.length === 0) return;
    const nudgeTimeout = setTimeout(() => {
      if (hasDoneInitialA11yNudgeRef.current) return;
      if (hasRestoredRef.current || pendingScrollItemID || pendingFocusItemID || pendingRestoreIDRef.current) return;
      hasDoneInitialA11yNudgeRef.current = true;
      const firstItemID = displayedItems[0]?.id;
      const node = firstItemID ? findNodeHandle(itemRefs.current[firstItemID]) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 500);
    return () => clearTimeout(nudgeTimeout);
  }, [displayedItems, isScreenReaderEnabled, pendingScrollItemID, pendingFocusItemID]);

  const screenTitle = mode === "today" ? t("screens.today") : t("home.title");
  const editionDateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    []
  );
  const emptyTitle = isOnlyNewEmpty
    ? t("home.empty.noNewTitle")
    : isFavoritesEmpty
      ? t("home.empty.noFavoritesTitle")
      : mode === "today" ? t("home.empty.todayTitle") : t("home.empty.noStoriesTitle");
  const emptyBody = isOnlyNewEmpty
    ? t("home.empty.noNewBody")
    : isFavoritesEmpty
      ? t("home.empty.noFavoritesBody")
      : mode === "today"
        ? t("home.empty.todayBody")
        : t("home.empty.noStoriesBody");

  return (
    <Screen>
      <View style={styles.header}>
        {mode === "allUnread" ? (
          <Text
            style={[styles.greeting, { color: theme.colors.onSurfaceVariant }]}
            accessibilityRole="header"
            accessibilityLabel={getTimeGreeting(t, app.settings?.displayName)}
          >
            {getTimeGreeting(t, app.settings?.displayName)}
          </Text>
        ) : null}

        <View
          style={styles.logoRow}
          accessible
          accessibilityRole="header"
          accessibilityLabel={screenTitle}
          accessibilityActions={[{ name: "markAllRead", label: t("home.menu.markAllRead") }]}
          onAccessibilityAction={({ nativeEvent: { actionName } }) => {
            if (actionName === "markAllRead") { handleMarkAllAsRead(); }
          }}
        >
          {mode === "allUnread" ? (
            <MsgHeaderBanner
              width={screenWidth - 24}
              height={(screenWidth - 24) * (148 / 680)}
              accessible={false}
              accessibilityElementsHidden
            />
          ) : (
            <Text
              style={[styles.appTitle, { color: theme.colors.onSurface }]}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {screenTitle}
            </Text>
          )}
        </View>

        {mode === "allUnread" ? (
          <View style={styles.editionRow}>
            <Text
              style={[styles.editionTitle, { color: theme.colors.onSurface }]}
              accessibilityRole="header"
            >
              {t("home.editionTitle")}
            </Text>
            <Text style={[styles.editionSummary, { color: theme.colors.onSurfaceVariant }]}>
              {t("home.editionSummary", { count: visibleItems.length, date: editionDateLabel })}
            </Text>
          </View>
        ) : null}

        <View style={styles.headerButtons}>
          <Pressable
            onPress={handleOpenViewMenu}
            style={({ pressed }) => [
              styles.viewButton,
              {
                borderColor: theme.colors.outline,
                backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent",
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("home.view.currentLabel", {
              view: t(`home.view.${newsView}`),
              position: NEWS_VIEW_ORDER.indexOf(newsView) + 1,
              total: NEWS_VIEW_ORDER.length,
            })}
            accessibilityHint={t("home.view.hint")}
          >
            <Text style={[styles.viewButtonText, { color: theme.colors.primary }]} numberOfLines={1}>
              {t(`home.view.${newsView}`)}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color={theme.colors.primary}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
          <View
            style={styles.headerIconButtons}
            importantForAccessibility={screenReaderOptimized ? "no-hide-descendants" : "auto"}
            accessibilityElementsHidden={screenReaderOptimized}
          >
            <IconButton
              icon={isSearchVisible ? "magnify-close" : "magnify"}
              mode="outlined"
              onPress={handleFindInTimeline}
              iconColor={theme.colors.primary}
              style={styles.iconButton}
              accessibilityLabel={isSearchVisible ? t("home.menu.hideFindInTimeline") : t("home.menu.findInTimeline")}
              accessibilityRole="button"
              accessibilityHint={isSearchVisible ? t("home.searchDoneHint") : t("home.searchHint")}
            />
            {app.isLoading || app.isRefreshing || isPodcastBuffering ? (
              <View
                style={[styles.iconButton, styles.spinnerButton, { borderColor: theme.colors.outline }]}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={isPodcastBuffering ? t("a11y.playPodcast") : t("common.refresh")}
              >
                <ActivityIndicator size={18} color={theme.colors.primary} />
              </View>
            ) : (
              <IconButton
                icon="refresh"
                mode="outlined"
                onPress={handleRefresh}
                iconColor={theme.colors.primary}
                style={styles.iconButton}
                accessibilityLabel={t("common.refresh")}
                accessibilityRole="button"
                accessibilityHint={t("common.refresh")}
              />
            )}
            <IconButton
              icon="dots-horizontal"
              mode="outlined"
              onPress={handleOpenMoreActions}
              iconColor={theme.colors.primary}
              style={styles.iconButton}
              accessibilityLabel={t("home.menu.moreActions")}
              accessibilityRole="button"
              accessibilityHint={t("home.menu.moreActionsHint")}
            />
            <SettingsGearButton onPress={onOpenPreferences} style={styles.iconButton} />
          </View>
        </View>

        {isSearchVisible ? (
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchFieldFlex}>
                <PlainSearchField
                  value={app.searchQuery}
                  onChangeText={app.setSearchQuery}
                  placeholder={t("search.placeholder")}
                  accessibilityLabel={t("search.placeholder")}
                  accessibilityHint={t("home.searchHint")}
                />
              </View>
              <Button
                mode="text"
                onPress={() => {
                  setIsSearchVisible(false);
                  app.setSearchQuery("");
                  setSelectedSearchFilter("all");
                }}
                accessibilityLabel={t("home.searchDoneLabel")}
                accessibilityRole="button"
                accessibilityHint={t("home.searchDoneHint")}
                compact
              >
                {t("common.done")}
              </Button>
            </View>
            <SearchFilterBar
              filters={SEARCH_FILTER_CHIPS}
              selectedFilter={selectedSearchFilter}
              onChange={setSelectedSearchFilter}
            />
          </>
        ) : null}

        {/* Editor's Note has no content source yet — the slot stays hidden (AdaptiveSection,
            Constitution rule 4) until real editorial copy exists. See PHASE_02_RESULTS.md. */}
        <AdaptiveSection itemCount={0}>
          <EditorsNote>{""}</EditorsNote>
        </AdaptiveSection>

        {app.errorMessage && dismissedError !== app.errorMessage ? (
          <View
            accessible={false}
            accessibilityLiveRegion="assertive"
            importantForAccessibility="no-hide-descendants"
          >
            <Banner
              visible
              actions={[{ label: t("common.dismiss"), onPress: () => setDismissedError(app.errorMessage) }]}
              accessibilityLabel={app.errorMessage}
            >
              {app.errorMessage}
            </Banner>
          </View>
        ) : null}
      </View>

      {app.isLoading && app.items.length === 0 ? (
        <FeedSkeleton />
      ) : isSearchActive ? (
        <FlatList
          key="search"
          data={searchResults}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <SearchResultRow result={item} onPress={handleSearchResultPress} />
          )}
          ListEmptyComponent={
            <EmptyState
              title={t("search.emptyTitle")}
              body={t("search.emptyBody")}
              actionLabel={t("common.refresh")}
              onAction={app.refresh}
            />
          }
          contentContainerStyle={searchResults.length === 0 ? styles.emptyList : styles.list}
          accessibilityLabel={
            searchResults.length > 0
              ? t("search.a11yResultCount", {
                  count: searchResults.length,
                  query: app.searchQuery.trim(),
                })
              : t("search.emptyTitle")
          }
        />
      ) : (
        <FlatList
          key="feed"
          ref={listRef}
          data={displayedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedItem}
          windowSize={isScreenReaderEnabled ? 21 : 5}
          maxToRenderPerBatch={isScreenReaderEnabled ? 20 : 5}
          initialNumToRender={isScreenReaderEnabled ? 20 : 7}
          removeClippedSubviews={!isScreenReaderEnabled}
          ListHeaderComponent={
            screenReaderOptimized ? (
              <Button
                mode="outlined"
                icon="tune-variant"
                onPress={handleCustomizeFeed}
                style={styles.customizeFeedButton}
                accessibilityRole="button"
                accessibilityLabel="Customize Feed"
                accessibilityHint="Double tap to open News & Timeline preferences."
              >
                Customize Feed
              </Button>
            ) : null
          }
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          }}
          refreshControl={
            Platform.OS === "android" ? undefined : (
              <RefreshControl refreshing={app.isRefreshing} onRefresh={handleRefresh} />
            )
          }
          onScroll={onScroll}
          scrollEventThrottle={100}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <EmptyState
              title={emptyTitle}
              body={emptyBody}
              actionLabel={
                isOnlyNewEmpty
                  ? t("home.empty.showAll")
                  : isFavoritesEmpty
                    ? t("home.empty.editFavorites")
                    : t("common.refresh")
              }
              onAction={isOnlyNewEmpty ? showAllItems : isFavoritesEmpty ? onOpenFavoritesSetup : app.refresh}
            />
          }
          contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.list}
        />
      )}
    </Screen>
  );
}

// Legacy export — not in the navigator but kept for safety
export { NewsScreenCore as NewsScreen };

const styles = StyleSheet.create({
  header: {
    padding: 12,
    gap: 12
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 2
  },
  appTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  greeting: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.1,
    marginTop: -4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  searchFieldFlex: {
    flex: 1
  },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8
  },
  headerIconButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  editionRow: {
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  editionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  editionSummary: {
    fontSize: 13,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 1,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  customizeFeedButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8
  },
  iconButton: {
    margin: 0
  },
  spinnerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    paddingBottom: 24
  },
  emptyList: {
    flexGrow: 1
  },
  loadMoreButton: {
    margin: 12,
    borderRadius: 8
  }
});
