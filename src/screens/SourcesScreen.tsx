import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import type { Source } from "../domain/models";
import { sourceAccessibilityHint, sourceAccessibilityLabel } from "../utils/accessibility";
import { sourceCategoryDisplayName, sourceTypeDisplayName, trustLabelDisplayName } from "../utils/formatting";
import { searchSources } from "../utils/search";

function SourceRow({ source, onToggle }: { source: Source; onToggle: (sourceID: string) => void }) {
  const theme = useTheme();

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: source.isEnabled }}
      accessibilityValue={{ text: source.isEnabled ? "On" : "Off" }}
      accessibilityLabel={sourceAccessibilityLabel(source)}
      accessibilityHint={sourceAccessibilityHint(source)}
      onPress={() => onToggle(source.id)}
      onAccessibilityTap={() => onToggle(source.id)}
    >
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
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </Pressable>
  );
}

export function SourcesScreen() {
  const app = useAppContext();
  const sources = useMemo(() => searchSources(app.sources, app.searchQuery), [app.sources, app.searchQuery]);
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
        <PlainSearchField
          value={app.searchQuery}
          onChangeText={app.setSearchQuery}
          placeholder="Search sources"
          accessibilityLabel="Search sources"
          accessibilityHint="Enter words to search source names, descriptions, categories, and stories throughout the app."
        />
      </View>
      <FlatList
        data={sources}
        keyExtractor={(source) => source.id}
        renderItem={({ item }) => <SourceRow source={item} onToggle={app.toggleSource} />}
        contentContainerStyle={styles.list}
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
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16
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
