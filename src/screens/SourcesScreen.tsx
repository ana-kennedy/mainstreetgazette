import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Card, Searchbar, Switch, Text } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import type { Source } from "../domain/models";
import { sourceAccessibilityHint, sourceAccessibilityLabel } from "../utils/accessibility";
import { sourceCategoryDisplayName, sourceTypeDisplayName, trustLabelDisplayName } from "../utils/formatting";
import { searchSources } from "../utils/search";

function SourceRow({ source, onToggle }: { source: Source; onToggle: (sourceID: string) => void }) {
  return (
    <Card
      mode="outlined"
      style={styles.card}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: source.isEnabled }}
      accessibilityLabel={sourceAccessibilityLabel(source)}
      accessibilityHint={sourceAccessibilityHint(source)}
      onPress={() => onToggle(source.id)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}>
          <View style={styles.sourceText}>
            <Text variant="titleMedium">{source.name}</Text>
            <Text variant="bodyMedium">
              {sourceTypeDisplayName(source.sourceType)} · {trustLabelDisplayName(source.trustLabel)}
            </Text>
            <Text variant="bodySmall">{source.categoryTags.map(sourceCategoryDisplayName).join(", ")}</Text>
            {source.description ? <Text variant="bodyMedium">{source.description}</Text> : null}
          </View>
          <Switch
            value={source.isEnabled}
            onValueChange={() => onToggle(source.id)}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      </Card.Content>
    </Card>
  );
}

export function SourcesScreen() {
  const app = useAppContext();
  const [query, setQuery] = useState("");
  const sources = useMemo(() => searchSources(app.sources, query), [app.sources, query]);
  const enabledCount = app.sources.filter((source) => source.isEnabled).length;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineMedium" accessibilityRole="header">
          Sources
        </Text>
        <Text variant="bodyLarge" accessibilityLabel={`${enabledCount} of ${app.sources.length} sources enabled.`}>
          {enabledCount} of {app.sources.length} enabled
        </Text>
        <Text variant="bodyMedium">
          Sources are third-party feeds. Enable only feeds you want Main Street Gazette to fetch.
        </Text>
        <Searchbar
          value={query}
          onChangeText={setQuery}
          placeholder="Search sources"
          accessibilityLabel="Search sources"
          accessibilityRole="search"
          accessibilityHint="Enter words to search source names, descriptions, and categories."
        />
      </View>
      <FlatList
        data={sources}
        keyExtractor={(source) => source.id}
        renderItem={({ item }) => <SourceRow source={item} onToggle={app.toggleSource} />}
        contentContainerStyle={styles.list}
        accessibilityLabel="Source manager list"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    gap: 8
  },
  list: {
    paddingBottom: 24
  },
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8
  },
  cardContent: {
    gap: 8
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  sourceText: {
    flex: 1,
    gap: 4
  }
});
