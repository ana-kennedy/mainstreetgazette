import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { AccessibilityStory } from "../intelligence/phase12/types";

const CATEGORY_LABELS: Record<string, string> = {
  das: "DAS",
  blind_low_vision: "Vision",
  mobility: "Mobility",
  service_animals: "Animals",
  captions: "Captions",
};

function AccessibilityStoryRow({
  story,
  onPress,
}: {
  story: AccessibilityStory;
  onPress: () => void;
}) {
  const theme = useTheme();
  const categoryLabel = CATEGORY_LABELS[story.primaryCategory] ?? story.primaryCategory;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent" },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={story.accessibilityLabel}
      accessibilityHint={story.accessibilityHint}
    >
      <View style={styles.rowContent}>
        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Text
              style={[styles.categoryBadgeText, { color: theme.colors.onSecondaryContainer }]}
              accessible={false}
            >
              {categoryLabel}
            </Text>
          </View>
          {story.isBreaking ? (
            <View style={[styles.categoryBadge, { backgroundColor: theme.colors.error }]}>
              <Text
                style={[styles.categoryBadgeText, { color: theme.colors.onError }]}
                accessible={false}
              >
                BREAKING
              </Text>
            </View>
          ) : null}
          {story.isOfficial ? (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: theme.colors.onPrimaryContainer },
                ]}
                accessible={false}
              >
                OFFICIAL
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          variant="bodyMedium"
          numberOfLines={2}
          style={[styles.headline, { color: theme.colors.onSurface }]}
        >
          {story.headline}
        </Text>

        {story.sourceCount > 1 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {story.sourceCount} sources
          </Text>
        ) : null}
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

interface AccessibilityHubSectionProps {
  stories: AccessibilityStory[];
  onPressStory: (story: AccessibilityStory) => void;
}

export function AccessibilityHubSection({
  stories,
  onPressStory,
}: AccessibilityHubSectionProps) {
  const theme = useTheme();

  if (stories.length === 0) return null;

  return (
    <View
      style={styles.container}
      accessibilityRole="list"
      accessibilityLabel="Accessibility news"
    >
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={"human" as any}
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
          Accessibility News
        </Text>
      </View>

      {stories.map((story) => (
        <AccessibilityStoryRow
          key={story.clusterId}
          story={story}
          onPress={() => onPressStory(story)}
        />
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
  rowContent: {
    flex: 1,
    gap: 3,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  categoryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  headline: {
    fontWeight: "500",
    lineHeight: 19,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
});
