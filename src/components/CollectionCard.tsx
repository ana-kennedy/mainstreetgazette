import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LiveCollection } from "../intelligence/phase10/types";

interface CollectionCardProps {
  collection: LiveCollection;
  onPress: () => void;
  onToggleSave: () => void;
}

export function CollectionCard({ collection, onPress, onToggleSave }: CollectionCardProps) {
  const theme = useTheme();
  const { definition, totalCount, isSaved, mediaBreakdown } = collection;
  const icon = definition.icon ?? "folder-star";

  const mediaParts: string[] = [];
  if (mediaBreakdown.articles > 0) mediaParts.push(`${mediaBreakdown.articles} article${mediaBreakdown.articles !== 1 ? "s" : ""}`);
  if (mediaBreakdown.videos > 0) mediaParts.push(`${mediaBreakdown.videos} video${mediaBreakdown.videos !== 1 ? "s" : ""}`);
  if (mediaBreakdown.podcasts > 0) mediaParts.push(`${mediaBreakdown.podcasts} podcast${mediaBreakdown.podcasts !== 1 ? "s" : ""}`);
  const mediaLabel = mediaParts.slice(0, 2).join(", ");

  const a11yLabel = [
    definition.title,
    `${totalCount} ${totalCount === 1 ? "story" : "stories"}`,
    mediaLabel,
    isSaved ? "Followed" : "",
    definition.description ?? "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: isSaved ? theme.colors.primary : theme.colors.outline,
          borderWidth: isSaved ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Double tap to open this collection."
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={theme.colors.onPrimaryContainer}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>

      <Text
        variant="titleSmall"
        numberOfLines={2}
        style={[styles.title, { color: theme.colors.onSurface }]}
      >
        {definition.title}
      </Text>

      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
      >
        {totalCount} {totalCount === 1 ? "story" : "stories"}
      </Text>

      {mediaLabel ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>
          {mediaLabel}
        </Text>
      ) : null}

      <Pressable
        onPress={(e) => { e.stopPropagation(); onToggleSave(); }}
        style={[
          styles.followBtn,
          {
            backgroundColor: isSaved ? theme.colors.primary : theme.colors.surfaceVariant,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? `Unfollow ${definition.title}` : `Follow ${definition.title}`}
        accessibilityHint={isSaved ? "Double tap to unfollow this collection." : "Double tap to follow this collection."}
        accessibilityState={{ selected: isSaved }}
      >
        <Text
          variant="labelSmall"
          style={{
            color: isSaved ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
            fontWeight: "600",
          }}
        >
          {isSaved ? "Following" : "Follow"}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontWeight: "600",
    lineHeight: 18,
  },
  followBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
});
