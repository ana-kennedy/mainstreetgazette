import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import type { FeedItem } from "../domain/models";
import type { SourcesStackParamList } from "../navigation/types";
import { sourceTypeDisplayName } from "../utils/formatting";

type Props = NativeStackScreenProps<SourcesStackParamList, "SourceFeed">;

const PAGE_SIZE = 10;
const ACCESSIBLE_PAGE_SIZE = 40;
const PRELOAD_REMAINING_CARD_COUNT = 5;

export function SourceFeedScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const app = useAppContext();
  const { playItem, addToQueue } = usePlayback();
  const theme = useTheme();
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const pageSize = isScreenReaderEnabled || Boolean(app.settings?.simplifiedLayoutEnabled) ? ACCESSIBLE_PAGE_SIZE : PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(() => pageSize);
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);

  const listRef = useRef<FlatList<FeedItem>>(null);
  const hasMoreRef = useRef(false);
  const itemsRef = useRef<FeedItem[]>([]);

  React.useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsScreenReaderEnabled)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setIsScreenReaderEnabled);
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (pageSize === ACCESSIBLE_PAGE_SIZE) {
      setVisibleCount((count) => Math.max(count, ACCESSIBLE_PAGE_SIZE));
    }
  }, [pageSize]);

  const items = useMemo(
    () =>
      app.items
        .filter((item) => item.sourceID === source.id)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    [app.items, source.id]
  );

  const displayed = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = displayed.length < items.length;

  hasMoreRef.current = hasMore;
  itemsRef.current = items;

  const handleOpen = useCallback(
    (item: FeedItem) => navigation.navigate("FeedDetail", { item }),
    [navigation]
  );

  const handleRefresh = useCallback(async () => {
    setIsUserRefreshing(true);
    try {
      await app.refresh();
    } finally {
      setIsUserRefreshing(false);
    }
  }, [app]);

  const onEndReached = useCallback(() => {
    if (!hasMoreRef.current) return;
    setVisibleCount((c) => Math.min(c + pageSize, itemsRef.current.length));
  }, [pageSize]);

  const handleCardFocus = useCallback((index: number) => {
    if (!hasMoreRef.current) return;
    if (displayed.length - index <= PRELOAD_REMAINING_CARD_COUNT) {
      setVisibleCount((c) => Math.min(c + pageSize, itemsRef.current.length));
    }
  }, [displayed.length, pageSize]);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <FeedItemCard
        item={item}
        settings={app.settings}
        sourceName={source.name}
        onOpen={handleOpen}
        onPlay={playItem}
        onQueue={addToQueue}
        onToggleSaved={app.toggleSaved}
        onMuteSource={app.muteSource}
        onAccessibilityFocus={() => handleCardFocus(index)}
      />
    ),
    [app.settings, app.toggleSaved, app.muteSource, handleOpen, playItem, addToQueue, source.name, handleCardFocus]
  );

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Double tap to return to Sources."
        >
          <Text style={[styles.backText, { color: theme.colors.primary }]}>← Sources</Text>
        </Pressable>
        <View style={styles.titleBlock} accessible accessibilityRole="header" accessibilityLabel={source.name}>
          <Text style={[styles.sourceTitle, { color: theme.colors.onSurface }]} accessible={false}>
            {source.name}
          </Text>
          <Text style={[styles.sourceType, { color: theme.colors.onSurfaceVariant }]} accessible={false}>
            {sourceTypeDisplayName(source.sourceType)} · {items.length} {items.length === 1 ? "story" : "stories"}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isUserRefreshing} onRefresh={handleRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <Button
              mode="outlined"
              icon="newspaper-plus"
              onPress={onEndReached}
              style={styles.loadMoreButton}
              accessibilityRole="button"
              accessibilityLabel="Load More Headlines"
              accessibilityHint="Double tap to show more headlines from this source."
            >
              Load More Headlines
            </Button>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No stories from this source"
            body="Refresh to pull in the latest content, or check that this source is enabled."
            actionLabel="Refresh"
            onAction={handleRefresh}
          />
        }
        contentContainerStyle={displayed.length === 0 ? styles.emptyList : styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    justifyContent: "center"
  },
  backText: {
    fontSize: 15,
    fontWeight: "500"
  },
  titleBlock: {
    gap: 2
  },
  sourceTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  sourceType: {
    fontSize: 13
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
  },
});
