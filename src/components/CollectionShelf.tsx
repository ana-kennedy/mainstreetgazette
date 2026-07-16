import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { CollectionCard } from "./CollectionCard";
import type { LiveCollection } from "../intelligence/phase10/types";

interface CollectionShelfProps {
  collections: LiveCollection[];
  onPressCollection: (collectionId: string) => void;
  onToggleSave: (collectionId: string) => void;
}

export function CollectionShelf({
  collections,
  onPressCollection,
  onToggleSave,
}: CollectionShelfProps) {
  const theme = useTheme();

  if (collections.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text
        variant="titleMedium"
        style={[styles.header, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        Library
      </Text>
      <FlatList
        horizontal
        data={collections}
        keyExtractor={(item) => item.definition.id}
        renderItem={({ item }) => (
          <CollectionCard
            collection={item}
            onPress={() => onPressCollection(item.definition.id)}
            onToggleSave={() => onToggleSave(item.definition.id)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="list"
        accessibilityLabel="Library"
      />
      <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    fontWeight: "600",
  },
  row: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
});
