import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from "react-native";
import { Text, useTheme } from "react-native-paper";
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

export function SourceFeedScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const app = useAppContext();
  const { playItem, addToQueue } = usePlayback();
  const theme = useTheme();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);

  const listRef = useRef<FlatList<FeedItem>>(null);
  const hasMoreRef = useRef(false);
  const itemsRef = useRef<FeedItem[]>([]);

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
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, itemsRef.current.length));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedItemCard
        item={item}
        settings={app.settings}
        sourceName={source.name}
        onOpen={handleOpen}
        onPlay={playItem}
        onQueue={addToQueue}
        onToggleSaved={app.toggleSaved}
        onSetMarker={app.setCheckpointAtItem}
        onMarkRead={app.markAsRead}
      />
    ),
    [app.settings, app.toggleSaved, app.setCheckpointAtItem, app.markAsRead, handleOpen, playItem, addToQueue, source.name]
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
});
