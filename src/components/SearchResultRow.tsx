import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { SearchResult } from "../search/searchTypes";

const MEDIA_TYPE_LABELS: Record<string, string> = {
  article: "Article",
  video: "Video",
  podcast: "Podcast",
  community: "Community",
  official: "Official",
  story: "Story",
};

interface SearchResultRowProps {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
}

export function SearchResultRow({ result, onPress }: SearchResultRowProps) {
  const theme = useTheme();
  const typeLabel =
    result.resultType === "story"
      ? "Story"
      : MEDIA_TYPE_LABELS[result.mediaType ?? ""] ?? "Article";

  const isOfficial = result.originalItem.sourceTrust === "official";

  return (
    <TouchableOpacity
      onPress={() => onPress(result)}
      accessibilityRole="button"
      accessibilityLabel={result.accessibilityLabel}
      accessibilityHint={result.accessibilityHint}
      style={[styles.row, { borderBottomColor: theme.colors.outline }]}
    >
      {/* Type badge */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: isOfficial
                ? theme.colors.primaryContainer
                : theme.colors.surfaceVariant,
            },
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
              {
                color: isOfficial
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant,
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {isOfficial ? `✦ ${typeLabel}` : typeLabel}
          </Text>
        </View>
        {result.resultType === "story" && result.subtitle ? (
          <Text
            style={[styles.sourceCount, { color: theme.colors.onSurfaceVariant }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {result.subtitle}
          </Text>
        ) : null}
      </View>

      {/* Title */}
      <Text
        style={[styles.title, { color: theme.colors.onSurface }]}
        numberOfLines={3}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {result.title}
      </Text>

      {/* Source + description */}
      {result.sourceName ? (
        <Text
          style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {result.sourceName}
        </Text>
      ) : null}

      {result.description && result.resultType !== "story" ? (
        <Text
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={2}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {result.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sourceCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  meta: {
    fontSize: 13,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});
