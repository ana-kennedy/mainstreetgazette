import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Searchbar, Text } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import type { SavedStackParamList } from "../navigation/types";
import { searchFeedItems } from "../utils/search";

type Props = NativeStackScreenProps<SavedStackParamList, "SavedHome">;

export function SavedScreen({ navigation }: Props) {
  const app = useAppContext();
  const [query, setQuery] = useState("");
  const visibleItems = useMemo(() => searchFeedItems(app.savedItems, query), [app.savedItems, query]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineMedium" accessibilityRole="header">
          Saved
        </Text>
        <Searchbar
          value={query}
          onChangeText={setQuery}
          placeholder="Search saved"
          accessibilityLabel="Search saved articles"
          accessibilityRole="search"
          accessibilityHint="Enter words to search saved items."
        />
      </View>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItemCard
            item={item}
            settings={app.settings}
            onOpen={(selected) => navigation.navigate("SavedDetail", { item: selected })}
            onToggleSaved={app.toggleSaved}
            onCheckpoint={app.setCheckpointAtItem}
          />
        )}
        ListEmptyComponent={<EmptyState title="No saved articles" body="Saved articles and episodes will appear here." />}
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.list}
        accessibilityLabel="Saved articles list"
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
