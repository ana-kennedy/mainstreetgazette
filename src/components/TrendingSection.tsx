import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { TrendingEntry } from "../intelligence/phase11/types";

interface TrendingSectionProps {
  entries: TrendingEntry[];
  onPressEntry: (entry: TrendingEntry) => void;
}

function TrendingRow({
  entry,
  onPress,
}: {
  entry: TrendingEntry;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent" },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={entry.accessibilityLabel}
      accessibilityHint="Double tap to read this story."
    >
      {/* Rank number */}
      <Text
        style={[styles.rank, { color: theme.colors.primary }]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {entry.rank}
      </Text>

      <View style={styles.content}>
        <View style={styles.badgeRow}>
          {entry.isBreaking ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
              <Text style={[styles.badgeText, { color: theme.colors.onError }]}>BREAKING</Text>
            </View>
          ) : null}
          {entry.isOfficial ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.badgeText, { color: theme.colors.onPrimaryContainer }]}>OFFICIAL</Text>
            </View>
          ) : null}
        </View>

        <Text
          variant="bodyMedium"
          numberOfLines={2}
          style={[styles.headline, { color: theme.colors.onSurface }]}
        >
          {entry.headline}
        </Text>

        <View style={styles.metaRow}>
          {entry.sourceCount > 1 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {entry.sourceCount} sources
            </Text>
          ) : null}
          {entry.velocity > 0 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.tertiary ?? theme.colors.primary }}>
              · {entry.velocity} new {entry.velocity === 1 ? "item" : "items"}
            </Text>
          ) : null}
          {entry.communityCount > 0 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              · {entry.communityCount} discussing
            </Text>
          ) : null}
        </View>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={16}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export function TrendingSection({ entries, onPressEntry }: TrendingSectionProps) {
  const theme = useTheme();

  if (entries.length === 0) return null;

  return (
    <View style={styles.container} accessibilityRole="list" accessibilityLabel="Trending stories">
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="trending-up"
          size={18}
          color={theme.colors.primary}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text
          variant="titleMedium"
          style={[styles.headerText, { color: theme.colors.onSurface }]}
          accessibilityRole="header"
        >
          Trending Now
        </Text>
      </View>

      {entries.map((entry) => (
        <TrendingRow key={entry.clusterId} entry={entry} onPress={() => onPressEntry(entry)} />
      ))}

      <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerText: {
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  rank: {
    fontSize: 18,
    fontWeight: "700",
    width: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  headline: {
    fontWeight: "500",
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
});
