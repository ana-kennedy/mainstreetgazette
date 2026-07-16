import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { ExploreHub } from "../intelligence/phase17";

interface Props {
  hub: ExploreHub;
}

function StatChip({ label, count, icon, accessibilityLabel, highlight }: {
  label: string;
  count: number;
  icon: string;
  accessibilityLabel: string;
  highlight?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: highlight
            ? theme.colors.errorContainer
            : theme.colors.surfaceVariant,
          borderColor: highlight ? theme.colors.error : theme.colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={13}
        color={highlight ? theme.colors.error : theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text
        variant="labelSmall"
        style={[
          styles.chipCount,
          { color: highlight ? theme.colors.error : theme.colors.onSurface },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {count}
      </Text>
      <Text
        variant="labelSmall"
        style={[
          styles.chipLabel,
          { color: highlight ? theme.colors.error : theme.colors.onSurfaceVariant },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </Text>
    </View>
  );
}

export function ExploreIntelligenceBar({ hub }: Props) {
  const theme = useTheme();

  if (hub.stats.every((s) => s.count === 0) && hub.trendingEntities.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { borderColor: theme.colors.outlineVariant }]}
      accessibilityLabel="Explore intelligence summary"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {hub.stats.map((stat) => (
          <StatChip
            key={stat.id}
            label={stat.label}
            count={stat.count}
            icon={stat.icon}
            accessibilityLabel={stat.accessibilityLabel}
            highlight={stat.id === "breaking" && stat.count > 0}
          />
        ))}

        {hub.trendingEntities.slice(0, 3).map((entity) => (
          <View
            key={entity.entityName}
            style={[
              styles.chip,
              styles.entityChip,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            accessible
            accessibilityRole="text"
            accessibilityLabel={entity.accessibilityLabel}
          >
            <Text
              variant="labelSmall"
              numberOfLines={1}
              style={[styles.entityName, { color: theme.colors.onPrimaryContainer }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {entity.entityName}
            </Text>
            <Text
              variant="labelSmall"
              style={[styles.chipLabel, { color: theme.colors.onPrimaryContainer, opacity: 0.7 }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {entity.clusterCount}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  entityChip: {
    maxWidth: 140,
  },
  chipCount: {
    fontWeight: "700",
    fontSize: 12,
  },
  chipLabel: {
    fontSize: 11,
  },
  entityName: {
    fontWeight: "600",
    fontSize: 12,
    flexShrink: 1,
  },
});
