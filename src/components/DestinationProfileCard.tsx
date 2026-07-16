import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { DestinationProfileResult } from "../intelligence/phase18";

interface Props {
  result: DestinationProfileResult;
}

export function DestinationProfileCard({ result }: Props) {
  const theme = useTheme();
  const { profile, clusterCount } = result;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={profile.accessibilityLabel}
    >
      {/* Description */}
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurface }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {profile.shortDescription}
      </Text>

      {/* Theme line */}
      {profile.themeDescription ? (
        <Text
          variant="bodySmall"
          style={[styles.theme, { color: theme.colors.onSurfaceVariant }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {profile.themeDescription}
        </Text>
      ) : null}

      {/* Stats row */}
      <View style={styles.statsRow}>
        {profile.openedYear ? (
          <View
            style={[styles.statChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Est. {profile.openedYear}
            </Text>
          </View>
        ) : null}
        {clusterCount > 0 ? (
          <View
            style={[styles.statChip, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.outlineVariant }]}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
              {clusterCount} {clusterCount === 1 ? "story" : "stories"}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  description: {
    lineHeight: 20,
  },
  theme: {
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  statChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
