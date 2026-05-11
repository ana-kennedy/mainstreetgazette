import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  FlatList,
  Image,
  ViewToken,
  findNodeHandle,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from "react-native";
import { ActivityIndicator, Banner, Button, IconButton, Text, useTheme } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import type { ContentType, FeedItem } from "../domain/models";
import { searchFeedItems } from "../utils/search";
import { loadLastSelectedID, saveLastSelectedID } from "../services/storage";

type Filter = "all" | ContentType | "social";
type DisplayMode = "full" | "minimal";
type TimelineMenuSection = "main" | "display-style" | "settings";

const PAGE_SIZE = 10;

const filterOrder: Filter[] = ["all", "article", "video", "podcast", "social"];

const filterLabels: Record<Filter, string> = {
  all: "All",
  article: "Articles",
  video: "Videos",
  podcast: "Podcasts",
  social: "Social"
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
  const filter: Filter = app.settings?.timelineContentFilter ?? "all";
  const displayMode: DisplayMode = app.settings?.timelineDisplayMode ?? "full";
  const [isTimelineMenuVisible, setIsTimelineMenuVisible] = useState(false);
  const [timelineMenuSection, setTimelineMenuSection] = useState<TimelineMenuSection>("main");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingFocusItemID, setPendingFocusItemID] = useState<string | null>(null);
  const [pendingScrollItemID, setPendingScrollItemID] = useState<string | null>(null);

  const listRef = useRef<FlatList<FeedItem>>(null);
  const itemRefs = useRef<Record<string, View | null>>({});
  const firstTimelineMenuItemRef = useRef<View>(null);
  const firstDisplayStyleItemRef = useRef<View>(null);
  const firstSettingsItemRef = useRef<View>(null);

  // Tracks the last article the user opened — used to anchor scroll after refresh and on reopen
  const lastSelectedIDRef = useRef<string | null>(null);

  // Infinite scroll + position tracking refs
  const firstVisibleIDRef = useRef<string | null>(null);
  const hasMoreItemsRef = useRef(false);
  const visibleItemsRef = useRef<FeedItem[]>([]);
  const lastDisplayedIDRef = useRef<string | null>(null);
  const pendingRestoreIDRef = useRef<string | null>(null);
  const hasRestoredRef = useRef(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 30 }).current;

  const closeTimelineMenu = () => {
    setIsTimelineMenuVisible(false);
    setTimelineMenuSection("main");
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
    const refToFocus =
      timelineMenuSection === "main"
        ? firstTimelineMenuItemRef
        : timelineMenuSection === "display-style"
          ? firstDisplayStyleItemRef
          : firstSettingsItemRef;
    const timer = setTimeout(() => {
      const node = findNodeHandle(refToFocus.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 150);
    return () => clearTimeout(timer);
  }, [isTimelineMenuVisible, timelineMenuSection]);

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
      filter === "all"
        ? newFiltered
        : filter === "social"
          ? newFiltered.filter((item) => item.sourceType === "redditFeed")
          : newFiltered.filter((item) => item.contentType === filter);
    const searched = searchFeedItems(typeFiltered, app.searchQuery);
    return [...searched].sort((lhs, rhs) => {
      const delta = new Date(rhs.publishedAt).getTime() - new Date(lhs.publishedAt).getTime();
      return app.settings?.sortOrder === "oldestFirst" ? -delta : delta;
    });
  }, [baseItems, app.searchQuery, app.settings?.showOnlyNew, app.settings?.sortOrder, filter]);

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
      />
    ),
    [app.settings, app.toggleSaved, app.setCheckpointAtItem, handleOpenItem, playItem, addToQueue, sourceByID]
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
        setPendingScrollItemID(anchorID);
        setPendingFocusItemID(null);
        return;
      }
    }
    setVisibleCount(PAGE_SIZE);
    setPendingFocusItemID(null);
  }, [app.items.length, app.searchQuery, app.settings?.showOnlyNew, app.settings?.sortOrder, app.settings?.timelineContentFilter]);

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

  // Scroll to anchor item after refresh (no accessibility focus change)
  useEffect(() => {
    if (!pendingScrollItemID) return;
    const idx = displayedItems.findIndex((item) => item.id === pendingScrollItemID);
    if (idx === -1) return;
    listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.15 });
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

  // Persist current position when app backgrounds — prefer scroll position over last-opened
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const posID = firstVisibleIDRef.current ?? lastSelectedIDRef.current;
      if (nextState === "background" && posID) {
        saveLastSelectedID(posID).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // Restore last selected article once items are available after app reopen
  useEffect(() => {
    if (hasRestoredRef.current || !pendingRestoreIDRef.current || visibleItemsRef.current.length === 0) return;
    const savedID = pendingRestoreIDRef.current;
    const idx = visibleItemsRef.current.findIndex((item) => item.id === savedID);
    if (idx === -1) {
      pendingRestoreIDRef.current = null;
      return;
    }
    hasRestoredRef.current = true;
    pendingRestoreIDRef.current = null;
    const neededCount = Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE;
    setVisibleCount((c) => Math.max(c, neededCount));
    setPendingFocusItemID(savedID);
  }, [app.items.length]);

  // Load saved position on mount. On iOS, items often load from cache before AsyncStorage resolves,
  // so we restore immediately if items are already available rather than waiting for app.items.length
  // to change (which may never happen again in that session).
  useEffect(() => {
    loadLastSelectedID().then((savedID) => {
      if (!savedID) return;
      lastSelectedIDRef.current = savedID;
      if (!hasRestoredRef.current && visibleItemsRef.current.length > 0) {
        const idx = visibleItemsRef.current.findIndex((item) => item.id === savedID);
        if (idx !== -1) {
          hasRestoredRef.current = true;
          const neededCount = Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE;
          setVisibleCount((c) => Math.max(c, neededCount));
          setPendingFocusItemID(savedID);
        }
      } else {
        pendingRestoreIDRef.current = savedID;
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
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logo}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
          <Text
            style={[styles.appTitle, { color: theme.colors.onSurface }]}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {screenTitle}
          </Text>
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
            accessibilityLabel={`Timeline menu. Display: ${filterLabels[filter]}`}
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
            {timelineMenuSection === "main" ? (
              <>
                <Pressable
                  ref={firstTimelineMenuItemRef}
                  onPress={() => setTimelineMenuSection("display-style")}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel={`Display style: ${displayMode === "full" ? "Full" : "Minimal"}`}
                  accessibilityHint="Double tap to choose how much of each article to display."
                >
                  <Text style={{ color: theme.colors.onSurface }}>Display style: {displayMode === "full" ? "Full" : "Minimal"}</Text>
                </Pressable>

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
                  onPress={() => setTimelineMenuSection("settings")}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel="Timeline filter"
                  accessibilityHint="Double tap to open timeline filter including content types, sort order, and more."
                >
                  <Text style={{ color: theme.colors.onSurface }}>Timeline filter</Text>
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
              </>
            ) : null}

            {timelineMenuSection === "display-style" ? (
              <>
                <Pressable
                  ref={firstDisplayStyleItemRef}
                  onPress={() => setTimelineMenuSection("main")}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel="Back to timeline menu"
                  accessibilityHint="Double tap to go back to the main timeline menu."
                >
                  <Text style={{ color: theme.colors.primary }}>← Back</Text>
                </Pressable>

                <Text
                  style={[styles.menuSectionHeader, { color: theme.colors.onSurfaceVariant }]}
                  accessibilityRole="header"
                >
                  Display style
                </Text>

                {(["full", "minimal"] as DisplayMode[]).map((value) => {
                  const isSelected = displayMode === value;
                  const label = value === "full" ? "Full Mode" : "Minimal Mode";
                  const hint = value === "full"
                    ? "Displays everything in the article."
                    : "Displays just the title, source, and date.";
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        if (app.settings) app.updateSettings({ ...app.settings, timelineDisplayMode: value });
                        closeTimelineMenu();
                      }}
                      style={({ pressed }) => [
                        styles.menuItem,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryContainer
                            : pressed
                              ? theme.colors.surfaceVariant
                              : theme.colors.surface
                        }
                      ]}
                      accessibilityRole="menuitem"
                      accessibilityLabel={`${label}${isSelected ? ", selected" : ""}`}
                      accessibilityState={{ selected: isSelected }}
                      accessibilityHint={`Double tap to apply. ${hint}`}
                    >
                      <Text style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                        {label}{isSelected ? " ✓" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            {timelineMenuSection === "settings" ? (
              <>
                <Pressable
                  ref={firstSettingsItemRef}
                  onPress={() => setTimelineMenuSection("main")}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel="Back to timeline menu"
                  accessibilityHint="Double tap to go back to the main timeline menu."
                >
                  <Text style={{ color: theme.colors.primary }}>← Back</Text>
                </Pressable>

                <Text
                  style={[styles.menuSectionHeader, { color: theme.colors.onSurfaceVariant }]}
                  accessibilityRole="header"
                >
                  Timeline filter
                </Text>

                {filterOrder.map((value) => {
                  const isSelected = filter === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        if (app.settings) app.updateSettings({ ...app.settings, timelineContentFilter: value });
                        closeTimelineMenu();
                      }}
                      style={({ pressed }) => [
                        styles.menuItem,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryContainer
                            : pressed
                              ? theme.colors.surfaceVariant
                              : theme.colors.surface
                        }
                      ]}
                      accessibilityRole="menuitem"
                      accessibilityLabel={`Show ${filterLabels[value]}${isSelected ? ", currently selected" : ""}`}
                      accessibilityState={{ selected: isSelected }}
                      accessibilityHint="Double tap to filter the timeline to this content type."
                    >
                      <Text style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                        {filterLabels[value]}{isSelected ? " ✓" : ""}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={handleToggleShowOnlyNew}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel={`Show only new items: ${showOnlyNewLabel}`}
                  accessibilityState={{ checked: app.settings?.showOnlyNew ?? false }}
                  accessibilityHint={`Double tap to turn ${app.settings?.showOnlyNew ? "off" : "on"} the new items filter.`}
                >
                  <Text style={{ color: theme.colors.onSurface }}>Show only new: {showOnlyNewLabel}</Text>
                </Pressable>

                <Pressable
                  onPress={closeTimelineMenu}
                  style={({ pressed }) => [
                    styles.menuItem,
                    styles.menuItemClose,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface, borderTopColor: theme.colors.outline }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel="Done"
                  accessibilityHint="Double tap to close the timeline menu."
                >
                  <Text style={{ color: theme.colors.primary }}>Done</Text>
                </Pressable>
              </>
            ) : null}
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
        refreshControl={<RefreshControl refreshing={app.isRefreshing} onRefresh={handleRefresh} />}
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
  logo: {
    width: 38,
    height: 38,
    borderRadius: 9
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
  menuSectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4
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
