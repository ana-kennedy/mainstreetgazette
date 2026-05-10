import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import type { SavedStackParamList } from "../navigation/types";
import { searchFeedItems } from "../utils/search";

type Props = NativeStackScreenProps<SavedStackParamList, "SavedHome">;

export function SavedScreen({ navigation }: Props) {
  const app = useAppContext();
  const visibleItems = useMemo(() => searchFeedItems(app.savedItems, app.searchQuery), [app.savedItems, app.searchQuery]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineMedium" accessibilityRole="header">
          Saved
        </Text>
        <PlainSearchField
          value={app.searchQuery}
          onChangeText={app.setSearchQuery}
          placeholder="Search saved"
          accessibilityLabel="Search saved articles"
          accessibilityHint="Enter words to search saved items and the news feed throughout the app."
        />
      </View>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItemCard
            item={item}
            settings={app.settings}
            sourceName={app.sources.find((source) => source.id === item.sourceID)?.name ?? "Unknown website"}
            onOpen={(selected) => navigation.navigate("SavedDetail", { item: selected })}
            onToggleSaved={app.toggleSaved}
            onSetMarker={app.setCheckpointAtItem}
          />
        )}
        ListEmptyComponent={<EmptyState title="No saved articles" body="Saved articles and episodes will appear here." />}
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    gap: 12
  },
  list: {
    paddingBottom: 24
  },
  emptyList: {
    flexGrow: 1
  }
});
