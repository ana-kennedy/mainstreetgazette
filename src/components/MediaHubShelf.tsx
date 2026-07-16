import React from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MediaHubItem } from "../intelligence/phase14/types";

const CARD_WIDTH = 160;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MediaCard({
  item,
  onPress,
}: {
  item: MediaHubItem;
  onPress: () => void;
}) {
  const theme = useTheme();
  const isVideo = item.type === "video";
  const artwork = item.thumbnailURL ?? item.artworkURL;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityHint={item.accessibilityHint}
    >
      {/* Artwork / thumbnail area */}
      <View
        style={[styles.artworkContainer, { backgroundColor: theme.colors.surfaceVariant }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.artwork} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons
            name={isVideo ? ("youtube" as any) : ("podcast" as any)}
            size={32}
            color={theme.colors.onSurfaceVariant}
          />
        )}

        {/* Play icon overlay */}
        <View style={styles.playOverlay}>
          <MaterialCommunityIcons
            name={isVideo ? ("play-circle" as any) : ("play-circle-outline" as any)}
            size={24}
            color="rgba(255,255,255,0.9)"
          />
        </View>

        {/* Duration badge for podcasts */}
        {!isVideo && item.durationSeconds ? (
          <View style={[styles.durationBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
            <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        ) : null}

        {/* Type badge */}
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: isVideo
                ? theme.colors.errorContainer
                : theme.colors.primaryContainer,
            },
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
              {
                color: isVideo
                  ? theme.colors.onErrorContainer
                  : theme.colors.onPrimaryContainer,
              },
            ]}
          >
            {isVideo ? "VIDEO" : "PODCAST"}
          </Text>
        </View>
      </View>

      {/* Text content */}
      <View style={styles.cardText}>
        <Text
          variant="bodySmall"
          numberOfLines={3}
          style={[styles.cardTitle, { color: theme.colors.onSurface }]}
        >
          {item.title}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[styles.cardSource, { color: theme.colors.onSurfaceVariant }]}
        >
          {item.isOfficial ? "★ " : ""}{item.sourceName}
        </Text>
      </View>
    </Pressable>
  );
}

interface MediaHubShelfProps {
  videos: MediaHubItem[];
  podcasts: MediaHubItem[];
  onPressItem: (item: MediaHubItem) => void;
}

export function MediaHubShelf({ videos, podcasts, onPressItem }: MediaHubShelfProps) {
  const theme = useTheme();

  // Interleave: video, podcast, video, podcast… so the shelf shows both types
  const items: MediaHubItem[] = [];
  const maxLen = Math.max(videos.length, podcasts.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < videos.length) items.push(videos[i]);
    if (i < podcasts.length) items.push(podcasts[i]);
  }

  const displayed = items.slice(0, 8);
  if (displayed.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={"play-box-multiple" as any}
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
          Videos & Podcasts
        </Text>
      </View>

      <FlatList
        data={displayed}
        horizontal
        keyExtractor={(item) => item.feedItemId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        accessibilityLabel="Videos and podcasts"
        renderItem={({ item }) => (
          <MediaCard item={item} onPress={() => onPressItem(item)} />
        )}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  artworkContainer: {
    width: CARD_WIDTH,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  artwork: {
    width: CARD_WIDTH,
    height: 90,
    position: "absolute",
    top: 0,
    left: 0,
  },
  playOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
  },
  durationBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "600",
  },
  typeBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  cardText: {
    padding: 8,
    gap: 3,
  },
  cardTitle: {
    fontWeight: "500",
    lineHeight: 16,
  },
  cardSource: {
    lineHeight: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
});
