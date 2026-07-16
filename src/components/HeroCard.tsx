// Phase 53 — Visual Delight: full-width hero card for the top breaking / featured story.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { FeedItem } from "../domain/models";
import { relativePublishedText } from "../utils/formatting";

interface HeroCardProps {
  item: FeedItem;
  sourceName: string;
  isBreaking?: boolean;
  onPress: () => void;
}

export function HeroCard({ item, sourceName, isBreaking = false, onPress }: HeroCardProps) {
  const theme = useTheme();

  const a11yLabel = [
    isBreaking ? "Breaking." : "Featured.",
    item.title,
    sourceName,
    relativePublishedText(item.publishedAt),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isBreaking
            ? theme.colors.errorContainer
            : theme.colors.primaryContainer,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Double tap to read this story."
    >
      {/* Badge row */}
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isBreaking
                ? theme.colors.error
                : theme.colors.primary,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <MaterialCommunityIcons
            name={isBreaking ? ("lightning-bolt" as any) : ("star" as any)}
            size={11}
            color={isBreaking ? theme.colors.onError : theme.colors.onPrimary}
          />
          <Text
            style={[
              styles.badgeText,
              {
                color: isBreaking
                  ? theme.colors.onError
                  : theme.colors.onPrimary,
              },
            ]}
          >
            {isBreaking ? "BREAKING" : "FEATURED"}
          </Text>
        </View>
        <Text
          variant="bodySmall"
          style={{
            color: isBreaking
              ? theme.colors.onErrorContainer
              : theme.colors.onPrimaryContainer,
            opacity: 0.8,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {sourceName}
        </Text>
      </View>

      {/* Headline */}
      <Text
        variant="titleMedium"
        numberOfLines={3}
        style={[
          styles.headline,
          {
            color: isBreaking
              ? theme.colors.onErrorContainer
              : theme.colors.onPrimaryContainer,
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {item.title}
      </Text>

      {/* Footer */}
      <View style={styles.footer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text
          variant="bodySmall"
          style={{
            color: isBreaking
              ? theme.colors.onErrorContainer
              : theme.colors.onPrimaryContainer,
            opacity: 0.7,
          }}
        >
          {relativePublishedText(item.publishedAt)}
        </Text>
        <MaterialCommunityIcons
          name={"chevron-right" as any}
          size={16}
          color={
            isBreaking
              ? theme.colors.onErrorContainer
              : theme.colors.onPrimaryContainer
          }
          style={{ opacity: 0.6 }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headline: {
    fontWeight: "700",
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
