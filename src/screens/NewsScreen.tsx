import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Banner, Button, Searchbar, SegmentedButtons, Text } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import type { ContentType } from "../domain/models";
import type { NewsStackParamList } from "../navigation/types";
import { searchFeedItems } from "../utils/search";

type Props = NativeStackScreenProps<NewsStackParamList, "NewsHome">;
type Filter = "all" | ContentType;

export function NewsScreen({ navigation }: Props) {
  const app = useAppContext();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    const newFiltered = app.settings?.showOnlyNew ? app.items.filter((item) => item.isNewRelativeToCheckpoint) : app.items;
    const typeFiltered = filter === "all" ? newFiltered : newFiltered.filter((item) => item.contentType === filter);
    const searched = searchFeedItems(typeFiltered, query);
    return [...searched].sort((lhs, rhs) => {
      const delta = new Date(rhs.publishedAt).getTime() - new Date(lhs.publishedAt).getTime();
      return app.settings?.sortOrder === "oldestFirst" ? -delta : delta;
    });
  }, [app.items, app.settings?.showOnlyNew, app.settings?.sortOrder, filter, query]);

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
        <Searchbar
          value={query}
          onChangeText={setQuery}
          placeholder="Search news"
          accessibilityLabel="Search news"
          accessibilityRole="search"
          accessibilityHint="Enter words to search article titles, summaries, sources, and tags."
        />
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as Filter)}
          buttons={[
            { value: "all", label: "All", accessibilityLabel: "Show all items" },
            { value: "article", label: "Articles", accessibilityLabel: "Show articles" },
            { value: "video", label: "Videos", accessibilityLabel: "Show videos" },
            { value: "podcast", label: "Podcasts", accessibilityLabel: "Show podcasts" }
          ]}
        />
        {app.errorMessage && dismissedError !== app.errorMessage ? (
          <Banner visible actions={[{ label: "Dismiss", onPress: () => setDismissedError(app.errorMessage) }]} accessibilityLabel={`Error. ${app.errorMessage}`}>
            {app.errorMessage}
          </Banner>
        ) : null}
      </View>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItemCard
            item={item}
            settings={app.settings}
            onOpen={(selected) => navigation.navigate("FeedDetail", { item: selected })}
            onToggleSaved={app.toggleSaved}
            onCheckpoint={app.setCheckpointAtItem}
          />
        )}
        refreshControl={<RefreshControl refreshing={app.isRefreshing} onRefresh={app.refresh} />}
        ListEmptyComponent={
          <EmptyState
            title="No stories yet"
            body="Refresh feeds or enable more sources to bring in Disney news."
            actionLabel="Refresh"
            onAction={app.refresh}
          />
        }
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.list}
        accessibilityLabel="News feed"
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
  refreshButton: {
    margin: 12,
    borderRadius: 8
  }
});
