import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
import { MsgHeaderBanner } from "../components/MsgHeaderBanner";
import { ActivityIndicator, Banner, Button, IconButton, Text, useTheme } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import type { ContentType, FeedItem, ParkFilterKey } from "../domain/models";
import { searchFeedItems } from "../utils/search";
import { loadScrollPosition, saveScrollPosition, saveLastSelectedID } from "../services/storage";

type Filter = "all" | ContentType | "social";
type DisplayMode = "full" | "minimal";

const PAGE_SIZE = 10;

const filterOrder: Filter[] = ["all", "article", "video", "podcast", "social"];

const filterLabels: Record<Filter, string> = {
  all: "All",
  article: "Articles",
  video: "Videos",
  podcast: "Podcasts",
  social: "Social"
};

const parkFilterOrder: ParkFilterKey[] = [
  "all",
  "magic_kingdom",
  "epcot",
  "hollywood_studios",
  "animal_kingdom",
  "disneyland",
  "california_adventure",
  "disneyland_paris",
  "walt_disney_studios_paris",
  "tokyo_disneyland",
  "tokyo_disneysea",
  "shanghai_disneyland",
  "hong_kong_disneyland",
];

const parkFilterLabels: Record<ParkFilterKey, string> = {
  all: "All Parks",
  magic_kingdom: "Magic Kingdom",
  epcot: "EPCOT",
  hollywood_studios: "Hollywood Studios",
  animal_kingdom: "Animal Kingdom",
  disneyland: "Disneyland",
  california_adventure: "Calif. Adventure",
  disneyland_paris: "Disneyland Paris",
  walt_disney_studios_paris: "WD Studios Paris",
  tokyo_disneyland: "Tokyo Disneyland",
  tokyo_disneysea: "Tokyo DisneySea",
  shanghai_disneyland: "Shanghai",
  hong_kong_disneyland: "Hong Kong",
};

export interface NewsScreenCoreProps {
  mode: "today" | "allUnread";
  onNavigateToDetail: (item: FeedItem) => void;
  onNavigateToPlayer: () => void;
}

export function NewsScreenCore({ mode, onNavigateToDetail, onNavigateToPlayer }: NewsScreenCoreProps) {
  const app = useAppContext();
  const { playItem, addToQueue, isLoading: isPodcastBuffering } = usePlayback();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const filter: Filter = app.settings?.timelineContentFilter ?? "all";
  const displayMode: DisplayMode = app.settings?.timelineDisplayMode ?? "full";
  const parkFilter: ParkFilterKey = app.settings?.parkFilter ?? "all";
  const parkFilterActive = parkFilter !== "all";
  const effectiveFilter: Filter = parkFilterActive ? "article" : filter;
  const [isTimelineMenuVisible, setIsTimelineMenuVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingFocusItemID, setPendingFocusItemID] = useState<string | null>(null);
  const [pendingScrollItemID, setPendingScrollItemID] = useState<string | null>(null);

  const listRef = useRef<FlatList<FeedItem>>(null);
  const itemRefs = useRef<Record<string, View | null>>({});
  const firstTimelineMenuItemRef = useRef<View>(null);

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
  const hasRestoredRef = useRef(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 30 }).current;

  const closeTimelineMenu = () => {
    setIsTimelineMenuVisible(false);
  };

  const handleJumpToTop = () => {
    closeTimelineMenu();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    AccessibilityInfo.announceForAccessibility("Jumped to top of timeline.");
  };

  const handleJumpToMarker = () => {
    closeTimelineMenu();
    const markerIndex = visibleItems.findIndex((item) => !item.isNewRelativeToCheckpoint);
    if (markerIndex === -1) {
      AccessibilityInfo.announceForAccessibility("No marker has been set.");
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
    AccessibilityInfo.announceForAccessibility("Jumped to timeline marker.");
  };

  const handleFindInTimeline = () => {
    const nextVisible = !isSearchVisible;
    closeTimelineMenu();
    setIsSearchVisible(nextVisible);
    if (!nextVisible) {
      app.setSearchQuery("");
    } else {
      AccessibilityInfo.announceForAccessibility("Find in timeline field shown. Enter your search terms.");
    }
  };

  const handleRefresh = () => {
    app.refresh().catch(() => {});
  };

  const handleToggleSortOrder = () => {
    if (!app.settings) return;
    app.updateSettings({
      ...app.settings,
      sortOrder: app.settings.sortOrder === "oldestFirst" ? "newestFirst" : "oldestFirst"
    });
  };

  const handleToggleShowOnlyNew = () => {
    if (!app.settings) return;
    app.updateSettings({ ...app.settings, showOnlyNew: !app.settings.showOnlyNew });
  };

  useEffect(() => {
    if (!isTimelineMenuVisible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(firstTimelineMenuItemRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 150);
    return () => clearTimeout(timer);
  }, [isTimelineMenuVisible]);

  // Filter base items by mode before applying user filters
  const baseItems = useMemo(() => {
    if (mode === "today") {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return app.items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
    }
    return app.items;
  }, [app.items, mode]);

  const visibleItems = useMemo(() => {
    const newFiltered = app.settings?.showOnlyNew
      ? baseItems.filter((item) => item.isNewRelativeToCheckpoint)
      : baseItems;
    const typeFiltered =
      effectiveFilter === "all"
        ? newFiltered
        : effectiveFilter === "social"
          ? newFiltered.filter((item) => item.sourceType === "redditFeed")
          : newFiltered.filter((item) => item.contentType === effectiveFilter);
    const parkFiltered =
      parkFilter === "all"
        ? typeFiltered
        : typeFiltered.filter((item) => item.tags.includes(`park:${parkFilter}`));
    const searched = searchFeedItems(parkFiltered, app.searchQuery);
    return [...searched].sort((lhs, rhs) => {
      const delta = new Date(rhs.publishedAt).getTime() - new Date(lhs.publishedAt).getTime();
      return app.settings?.sortOrder === "oldestFirst" ? -delta : delta;
    });
  }, [baseItems, app.searchQuery, app.settings?.showOnlyNew, app.settings?.sortOrder, effectiveFilter, parkFilter]);

  const displayedItems = useMemo(() => visibleItems.slice(0, visibleCount), [visibleCount, visibleItems]);
  const hasMoreItems = displayedItems.length < visibleItems.length;

  // Keep mutable refs current so stable callbacks can read latest values
  hasMoreItemsRef.current = hasMoreItems;
  visibleItemsRef.current = visibleItems;
  lastDisplayedIDRef.current = displayedItems[displayedItems.length - 1]?.id ?? null;
  const isOnlyNewEmpty = Boolean(app.settings?.showOnlyNew && baseItems.length > 0 && visibleItems.length === 0);

  const sourceByID = useMemo(
    () => new Map(app.sources.map((s) => [s.id, s.name])),
    [app.sources]
  );

  const handleOpenItem = useCallback(
    (selected: FeedItem) => {
      lastSelectedIDRef.current = selected.id;
      saveLastSelectedID(selected.id).catch(() => {});
      onNavigateToDetail(selected);
    },
    [onNavigateToDetail]
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => (
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
        onSetMarker={app.setCheckpointAtItem}
        onMarkRead={app.markAsRead}
      />
    ),
    [app.settings, app.toggleSaved, app.setCheckpointAtItem, app.markAsRead, handleOpenItem, playItem, addToQueue, sourceByID]
  );

  const showAllItems = () => {
    if (app.settings) {
      app.updateSettings({ ...app.settings, showOnlyNew: false });
    }
  };

  useEffect(() => {
    // firstVisibleIDRef tracks the visible scroll position continuously via onViewableItemsChanged
    const anchorID = firstVisibleIDRef.current ?? lastSelectedIDRef.current;
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
  }, [app.items.length, app.searchQuery, app.settings?.showOnlyNew, app.settings?.sortOrder, app.settings?.timelineContentFilter, app.settings?.parkFilter]);

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

  // Persist current position when app backgrounds — saves exact pixel offset + anchor item ID
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        saveScrollPosition(mode, {
          itemID: firstVisibleIDRef.current ?? lastSelectedIDRef.current,
          offset: scrollOffsetRef.current
        }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [mode]);

  // Restore scroll position once items are available after app reopen (offset already set on mount)
  useEffect(() => {
    if (hasRestoredRef.current || !pendingRestoreIDRef.current || visibleItemsRef.current.length === 0) return;
    const savedID = pendingRestoreIDRef.current;
    const idx = visibleItemsRef.current.findIndex((item) => item.id === savedID);
    if (idx === -1) {
      pendingRestoreIDRef.current = null;
      pendingScrollOffsetRef.current = null;
      return;
    }
    hasRestoredRef.current = true;
    pendingRestoreIDRef.current = null;
    const neededCount = Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE;
    setVisibleCount((c) => Math.max(c, neededCount));
    setPendingScrollItemID(savedID);
  }, [app.items.length]);

  // Load saved position on mount. On iOS, items often load from cache before AsyncStorage resolves,
  // so we restore immediately if items are already available rather than waiting for app.items.length
  // to change (which may never happen again in that session).
  useEffect(() => {
    loadScrollPosition(mode).then((saved) => {
      if (!saved?.itemID) return;
      lastSelectedIDRef.current = saved.itemID;
      pendingScrollOffsetRef.current = saved.offset;
      if (!hasRestoredRef.current && visibleItemsRef.current.length > 0) {
        const idx = visibleItemsRef.current.findIndex((item) => item.id === saved.itemID);
        if (idx !== -1) {
          hasRestoredRef.current = true;
          const neededCount = Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE;
          setVisibleCount((c) => Math.max(c, neededCount));
          setPendingScrollItemID(saved.itemID);
        }
      } else {
        pendingRestoreIDRef.current = saved.itemID;
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortLabel = app.settings?.sortOrder === "oldestFirst" ? "Oldest first" : "Newest first";
  const showOnlyNewLabel = app.settings?.showOnlyNew ? "On" : "Off";
  const screenTitle = mode === "today" ? "Today" : "Main Street Gazette";
  const emptyTitle = isOnlyNewEmpty ? "No new stories" : (mode === "today" ? "Nothing published today" : "No stories yet");
  const emptyBody = isOnlyNewEmpty
    ? "You've read everything up to your marker. Tap 'Show all' to see older stories."
    : mode === "today"
      ? "Check back later or pull to refresh to bring in today's stories."
      : "Refresh feeds or enable more sources to bring in Disney news.";

  return (
    <Screen>
      <View style={styles.header}>
        <View
          style={styles.logoRow}
          accessible
          accessibilityRole="header"
          accessibilityLabel={screenTitle}
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

        {isSearchVisible ? (
          <View style={styles.searchRow}>
            <View style={styles.searchFieldFlex}>
              <PlainSearchField
                value={app.searchQuery}
                onChangeText={app.setSearchQuery}
                placeholder="Find in timeline"
                accessibilityLabel="Find in timeline"
                accessibilityHint="Enter words to search article titles, summaries, sources, and tags. Activate the Done button to close search."
              />
            </View>
            <Button
              mode="text"
              onPress={() => {
                setIsSearchVisible(false);
                app.setSearchQuery("");
              }}
              accessibilityLabel="Done searching"
              accessibilityRole="button"
              accessibilityHint="Double tap to close the search field and clear the search query."
              compact
            >
              Done
            </Button>
          </View>
        ) : null}

        <View style={styles.headerButtons}>
          <Button
            mode="outlined"
            icon="tune-variant"
            onPress={() => setIsTimelineMenuVisible((current) => !current)}
            accessibilityLabel={`Timeline menu. Display: ${filterLabels[filter]}${parkFilter !== "all" ? `, Park: ${parkFilterLabels[parkFilter]}` : ""}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: isTimelineMenuVisible }}
            accessibilityHint={
              Platform.OS === "ios"
                ? "Double tap to open timeline options including display style and find."
                : isTimelineMenuVisible
                  ? "Double tap to close the timeline menu."
                  : "Double tap to open timeline options."
            }
          >
            Timeline
          </Button>
          <IconButton
            icon={app.settings?.sortOrder === "oldestFirst" ? "sort-ascending" : "sort-descending"}
            mode="outlined"
            onPress={handleToggleSortOrder}
            iconColor={theme.colors.primary}
            style={styles.iconButton}
            accessibilityLabel={`Sort: ${sortLabel}`}
            accessibilityRole="button"
            accessibilityHint={`Currently ${sortLabel}. Double tap to switch to ${app.settings?.sortOrder === "oldestFirst" ? "Newest first" : "Oldest first"}.`}
          />
          {app.isLoading || app.isRefreshing || isPodcastBuffering ? (
            <View
              style={[styles.iconButton, styles.spinnerButton, { borderColor: theme.colors.outline }]}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={isPodcastBuffering ? "Podcast buffering" : "Refreshing feeds"}
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
              accessibilityLabel="Refresh"
              accessibilityRole="button"
              accessibilityHint="Double tap to fetch the latest stories from enabled sources."
            />
          )}
        </View>

        {isTimelineMenuVisible ? (
          <View
            style={[styles.timelineMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessible={false}
            accessibilityRole="menu"
          >
            {/* Display style — adjustable: VoiceOver swipes up/down, sighted users tap to cycle */}
            <Pressable
              ref={firstTimelineMenuItemRef}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`Display style: ${displayMode === "full" ? "Full" : "Minimal"}`}
              accessibilityValue={{ text: displayMode === "full" ? "Full" : "Minimal" }}
              accessibilityHint="Swipe up or down with VoiceOver, or double tap to cycle."
              accessibilityActions={[
                { name: "increment", label: "next display style" },
                { name: "decrement", label: "previous display style" }
              ]}
              onAccessibilityAction={({ nativeEvent: { actionName } }) => {
                if (!app.settings) return;
                const modes: DisplayMode[] = ["full", "minimal"];
                const idx = modes.indexOf(displayMode);
                const next = actionName === "increment"
                  ? modes[(idx + 1) % modes.length]
                  : modes[(idx - 1 + modes.length) % modes.length];
                app.updateSettings({ ...app.settings, timelineDisplayMode: next });
              }}
              onPress={() => {
                if (!app.settings) return;
                const next: DisplayMode = displayMode === "full" ? "minimal" : "full";
                app.updateSettings({ ...app.settings, timelineDisplayMode: next });
              }}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
              ]}
            >
              <View style={styles.menuItemRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Text style={{ color: theme.colors.onSurface, flex: 1 }}>Display style</Text>
                <Text style={{ color: theme.colors.primary }}>{displayMode === "full" ? "Full" : "Minimal"} ▾</Text>
              </View>
            </Pressable>

            {/* Filter — locked to Articles when By Park is active */}
            <Pressable
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={
                parkFilterActive
                  ? `Filter: Articles, locked. By Park filter is active.`
                  : `Filter: ${filterLabels[filter]}`
              }
              accessibilityValue={{ text: parkFilterActive ? "Articles (locked)" : filterLabels[filter] }}
              accessibilityHint={
                parkFilterActive
                  ? "Filter is locked to Articles while a park is selected. Change By Park to All to unlock."
                  : "Swipe up or down with VoiceOver, or double tap to cycle."
              }
              accessibilityActions={[
                { name: "increment", label: "next filter" },
                { name: "decrement", label: "previous filter" }
              ]}
              onAccessibilityAction={({ nativeEvent: { actionName } }) => {
                if (parkFilterActive) {
                  AccessibilityInfo.announceForAccessibility(
                    "Filter is locked to Articles while a park is selected. Set By Park to All Parks to change the filter."
                  );
                  return;
                }
                if (!app.settings) return;
                const idx = filterOrder.indexOf(filter);
                const next = actionName === "decrement"
                  ? filterOrder[(idx - 1 + filterOrder.length) % filterOrder.length]
                  : filterOrder[(idx + 1) % filterOrder.length];
                app.updateSettings({ ...app.settings, timelineContentFilter: next });
              }}
              onPress={() => {
                if (parkFilterActive) {
                  AccessibilityInfo.announceForAccessibility(
                    "Filter is locked to Articles while a park is selected. Set By Park to All Parks to change the filter."
                  );
                  return;
                }
                if (!app.settings) return;
                const idx = filterOrder.indexOf(filter);
                app.updateSettings({ ...app.settings, timelineContentFilter: filterOrder[(idx + 1) % filterOrder.length] });
              }}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface },
                parkFilterActive && { opacity: 0.4 },
              ]}
            >
              <View style={styles.menuItemRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Text style={{ color: theme.colors.onSurface, flex: 1 }}>Filter</Text>
                <Text style={{ color: theme.colors.primary }}>
                  {parkFilterActive ? "Articles (locked)" : `${filterLabels[filter]} ▾`}
                </Text>
              </View>
            </Pressable>

            {/* By Park — adjustable: VoiceOver swipes up/down, sighted users tap to cycle */}
            <Pressable
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`By Park: ${parkFilterLabels[parkFilter]}`}
              accessibilityValue={{ text: parkFilterLabels[parkFilter] }}
              accessibilityHint="Swipe up or down with VoiceOver, or double tap to cycle through parks."
              accessibilityActions={[
                { name: "increment", label: "next park" },
                { name: "decrement", label: "previous park" }
              ]}
              onAccessibilityAction={({ nativeEvent: { actionName } }) => {
                if (!app.settings) return;
                const idx = parkFilterOrder.indexOf(parkFilter);
                const next = actionName === "increment"
                  ? parkFilterOrder[(idx + 1) % parkFilterOrder.length]
                  : parkFilterOrder[(idx - 1 + parkFilterOrder.length) % parkFilterOrder.length];
                app.updateSettings({ ...app.settings, parkFilter: next });
              }}
              onPress={() => {
                if (!app.settings) return;
                const idx = parkFilterOrder.indexOf(parkFilter);
                app.updateSettings({ ...app.settings, parkFilter: parkFilterOrder[(idx + 1) % parkFilterOrder.length] });
              }}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
              ]}
            >
              <View style={styles.menuItemRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Text style={{ color: theme.colors.onSurface, flex: 1 }}>By Park</Text>
                <Text style={{ color: theme.colors.primary }}>{parkFilterLabels[parkFilter]} ▾</Text>
              </View>
            </Pressable>

            {/* Show only new — simple toggle */}
            <Pressable
              onPress={handleToggleShowOnlyNew}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel={`Show only new: ${showOnlyNewLabel}`}
              accessibilityState={{ checked: app.settings?.showOnlyNew ?? false }}
              accessibilityHint={`Double tap to turn ${app.settings?.showOnlyNew ? "off" : "on"} the new items filter.`}
            >
              <View style={styles.menuItemRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Text style={{ color: theme.colors.onSurface, flex: 1 }}>Show only new</Text>
                <Text style={{ color: theme.colors.primary }}>{showOnlyNewLabel}</Text>
              </View>
            </Pressable>

            <View style={[styles.menuDivider, { borderTopColor: theme.colors.outline }]} />

            <Pressable
              onPress={handleJumpToMarker}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel="Jump to marker"
              accessibilityHint="Double tap to scroll to the timeline marker position."
            >
              <Text style={{ color: theme.colors.onSurface }}>Jump to marker</Text>
            </Pressable>

            <Pressable
              onPress={handleJumpToTop}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel="Jump to top"
              accessibilityHint="Double tap to scroll to the top of the timeline."
            >
              <Text style={{ color: theme.colors.onSurface }}>Jump to top</Text>
            </Pressable>

            <Pressable
              onPress={handleFindInTimeline}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel={isSearchVisible ? "Hide find in timeline" : "Find in timeline"}
              accessibilityHint={
                isSearchVisible
                  ? "Double tap to hide the search field and clear the search query."
                  : "Double tap to show the search field for finding items in the timeline."
              }
            >
              <Text style={{ color: theme.colors.onSurface }}>{isSearchVisible ? "Hide find in timeline" : "Find in timeline"}</Text>
            </Pressable>

            <Pressable
              onPress={closeTimelineMenu}
              style={({ pressed }) => [
                styles.menuItem,
                styles.menuItemClose,
                { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface, borderTopColor: theme.colors.outline }
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel="Close menu"
              accessibilityHint="Double tap to close the timeline menu."
            >
              <Text style={{ color: theme.colors.primary }}>Close menu</Text>
            </Pressable>
          </View>
        ) : null}

        {app.errorMessage && dismissedError !== app.errorMessage ? (
          <Banner
            visible
            actions={[{ label: "Dismiss", onPress: () => setDismissedError(app.errorMessage) }]}
            accessibilityLabel={`Error. ${app.errorMessage}`}
          >
            {app.errorMessage}
          </Banner>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={displayedItems}
        importantForAccessibility={isTimelineMenuVisible ? "no-hide-descendants" : "auto"}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedItem}
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
            actionLabel={isOnlyNewEmpty ? "Show all" : "Refresh"}
            onAction={isOnlyNewEmpty ? showAllItems : app.refresh}
          />
        }
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.list}
      />
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
  timelineMenu: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: "hidden"
  },
  menuItem: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  menuItemClose: {
    borderTopWidth: StyleSheet.hairlineWidth
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  menuDivider: {
    borderTopWidth: StyleSheet.hairlineWidth
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
