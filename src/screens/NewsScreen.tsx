import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  FlatList,
  findNodeHandle,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from "react-native";
import { ActivityIndicator, Banner, Button, Text, useTheme } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import type { ContentType, FeedItem } from "../domain/models";
import type { NewsStackParamList } from "../navigation/types";
import { searchFeedItems } from "../utils/search";

type Props = NativeStackScreenProps<NewsStackParamList, "NewsHome">;
type Filter = "all" | ContentType;
const PAGE_SIZE = 10;

const filterOrder: Filter[] = ["all", "article", "video", "podcast"];

const filterLabels: Record<Filter, string> = {
  all: "All",
  article: "Articles",
  video: "Videos",
  podcast: "Podcasts"
};

export function NewsScreen({ navigation }: Props) {
  const app = useAppContext();
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingFocusItemID, setPendingFocusItemID] = useState<string | null>(null);
  const firstFilterOptionRef = useRef<View>(null);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const itemRefs = useRef<Record<string, View | null>>({});

  const closeFilterMenu = () => setIsFilterMenuVisible(false);
  const filterAccessibilityActions =
    Platform.OS === "ios"
      ? filterOrder.map((value) => ({
          name: `filter-${value}`,
          label: `Show ${filterLabels[value]}`
        }))
      : undefined;

  const handleFilterAccessibilityAction = (event: AccessibilityActionEvent) => {
    const nextFilter = event.nativeEvent.actionName.replace("filter-", "") as Filter;
    if (nextFilter in filterLabels) {
      setFilter(nextFilter);
      closeFilterMenu();
    }
  };

  useEffect(() => {
    if (!isFilterMenuVisible) {
      return;
    }

    const focusTimeout = setTimeout(() => {
      const node = findNodeHandle(firstFilterOptionRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 150);

    return () => clearTimeout(focusTimeout);
  }, [isFilterMenuVisible]);

  const visibleItems = useMemo(() => {
    const newFiltered = app.settings?.showOnlyNew ? app.items.filter((item) => item.isNewRelativeToCheckpoint) : app.items;
    const typeFiltered = filter === "all" ? newFiltered : newFiltered.filter((item) => item.contentType === filter);
    const searched = searchFeedItems(typeFiltered, app.searchQuery);
    return [...searched].sort((lhs, rhs) => {
      const delta = new Date(rhs.publishedAt).getTime() - new Date(lhs.publishedAt).getTime();
      return app.settings?.sortOrder === "oldestFirst" ? -delta : delta;
    });
  }, [app.items, app.searchQuery, app.settings?.showOnlyNew, app.settings?.sortOrder, filter]);
  const displayedItems = useMemo(() => visibleItems.slice(0, visibleCount), [visibleCount, visibleItems]);
  const hasMoreItems = displayedItems.length < visibleItems.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setPendingFocusItemID(null);
  }, [app.items.length, app.searchQuery, app.settings?.showOnlyNew, app.settings?.sortOrder, filter]);

  useEffect(() => {
    if (!pendingFocusItemID) {
      return;
    }

    const nextItemIndex = displayedItems.findIndex((item) => item.id === pendingFocusItemID);
    if (nextItemIndex === -1) {
      return;
    }

    listRef.current?.scrollToIndex({ index: nextItemIndex, animated: false, viewPosition: 0 });

    const focusTimeout = setTimeout(() => {
      const node = findNodeHandle(itemRefs.current[pendingFocusItemID]);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
        setPendingFocusItemID(null);
      }
    }, 300);

    return () => clearTimeout(focusTimeout);
  }, [displayedItems, pendingFocusItemID]);

  const loadMoreItems = () => {
    const firstNewItem = visibleItems[visibleCount];
    if (!firstNewItem) {
      return;
    }

    setPendingFocusItemID(firstNewItem.id);
    setVisibleCount((current) => Math.min(current + PAGE_SIZE, visibleItems.length));
  };

  if (app.isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Loading Main Street Gazette" />
          <Text>Loading Main Street Gazette</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.appTitle} accessibilityRole="header">
          Main Street Gazette
        </Text>
        <PlainSearchField
          value={app.searchQuery}
          onChangeText={app.setSearchQuery}
          placeholder="Search news"
          accessibilityLabel="Search news"
          accessibilityHint="Enter words to search article titles, summaries, sources, saved items, and tags throughout the app."
        />
        <Button
          mode="outlined"
          onPress={() => setIsFilterMenuVisible((current) => !current)}
          accessibilityLabel={`Filter menu. Current filter ${filterLabels[filter]}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isFilterMenuVisible }}
          accessibilityHint={
            Platform.OS === "ios"
              ? "Swipe up or down to choose a filter action. Double tap to open filter options."
              : isFilterMenuVisible
                ? "Double tap to close the filter menu."
                : "Double tap to open filter options."
          }
          accessibilityActions={filterAccessibilityActions}
          onAccessibilityAction={Platform.OS === "ios" ? handleFilterAccessibilityAction : undefined}
        >
          Filter: {filterLabels[filter]}
        </Button>
        {isFilterMenuVisible ? (
          <View
            style={[styles.filterMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessible={false}
            accessibilityRole="menu"
          >
            {filterOrder.map((value, index) => {
              const isSelected = filter === value;
              return (
                <Pressable
                  key={value}
                  ref={index === 0 ? firstFilterOptionRef : undefined}
                  onPress={() => {
                    setFilter(value);
                    closeFilterMenu();
                  }}
                  style={({ pressed }) => [
                    styles.filterOption,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primaryContainer
                        : pressed
                          ? theme.colors.surfaceVariant
                          : theme.colors.surface
                    }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel={`${filterLabels[value]}${isSelected ? ", selected" : ""}`}
                  accessibilityState={{ selected: isSelected }}
                  accessibilityHint="Double tap to apply this filter."
                >
                  <Text style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>{filterLabels[value]}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={closeFilterMenu}
              style={({ pressed }) => [styles.filterOption, { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface }]}
              accessibilityRole="menuitem"
              accessibilityLabel="Close filter menu"
            >
              <Text>Close filter menu</Text>
            </Pressable>
          </View>
        ) : null}
        {app.errorMessage && dismissedError !== app.errorMessage ? (
          <Banner visible actions={[{ label: "Dismiss", onPress: () => setDismissedError(app.errorMessage) }]} accessibilityLabel={`Error. ${app.errorMessage}`}>
            {app.errorMessage}
          </Banner>
        ) : null}
      </View>
      <FlatList
        ref={listRef}
        data={displayedItems}
        importantForAccessibility={isFilterMenuVisible ? "no-hide-descendants" : "auto"}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItemCard
            focusRef={(node) => {
              itemRefs.current[item.id] = node;
            }}
            item={item}
            settings={app.settings}
            sourceName={app.sources.find((source) => source.id === item.sourceID)?.name ?? "Unknown website"}
            onOpen={(selected) => navigation.navigate("FeedDetail", { item: selected })}
            onToggleSaved={app.toggleSaved}
            onCheckpoint={app.setCheckpointAtItem}
          />
        )}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
        }}
        refreshControl={<RefreshControl refreshing={app.isRefreshing} onRefresh={app.refresh} />}
        ListFooterComponent={
          hasMoreItems ? (
            <Button
              mode="outlined"
              icon="plus"
              onPress={loadMoreItems}
              style={styles.loadMoreButton}
              accessibilityLabel={`Load ${Math.min(PAGE_SIZE, visibleItems.length - displayedItems.length)} more stories`}
              accessibilityRole="button"
              accessibilityHint="Double tap to add more stories to the news feed. Focus will move to the first newly loaded story."
            >
              Load more
            </Button>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No stories yet"
            body="Refresh feeds or enable more sources to bring in Disney news."
            actionLabel="Refresh"
            onAction={app.refresh}
          />
        }
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.list}
      />
      <Button
        mode="contained"
        icon="refresh"
        onPress={app.refresh}
        loading={app.isRefreshing}
        style={styles.refreshButton}
        accessibilityLabel="Refresh feeds"
        accessibilityRole="button"
        accessibilityHint="Double tap to fetch the latest stories from enabled sources."
      >
        Refresh
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    gap: 12
  },
  appTitle: {
    textAlign: "center"
  },
  filterMenu: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: "hidden"
  },
  filterOption: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  list: {
    paddingBottom: 96
  },
  emptyList: {
    flexGrow: 1
  },
  loadMoreButton: {
    margin: 12,
    borderRadius: 8
  },
  refreshButton: {
    margin: 12,
    borderRadius: 8
  }
});
