import React from "react";
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "react-native-paper";
import type { FeedItem, UserSettings } from "../domain/models";
import { usePlayback } from "../context/PlaybackContext";
import { buildFeedItemAccessibility } from "../utils/accessibility";
import { clockString, relativePublishedText, summarizeItem } from "../utils/formatting";

interface FeedItemCardProps {
  item: FeedItem;
  settings: UserSettings | null;
  onOpen: (item: FeedItem) => void;
  onToggleSaved: (itemID: string) => void;
  onCheckpoint: (item: FeedItem) => void;
}

function Pill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.surfaceVariant }]} accessible accessibilityRole="text" accessibilityLabel={label}>
      <Text style={[styles.pillText, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  hint,
  onPress,
  primary = false,
  disabled = false,
  loading = false
}: {
  label: string;
  hint: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const primaryColor = theme.colors.primary;
  const primaryTextColor = theme.dark ? "#101317" : "#ffffff";
  const secondaryBackground = theme.colors.surface;
  const disabledTextColor = theme.colors.onSurfaceVariant;

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor: primary ? primaryColor : secondaryBackground,
          borderColor: primary ? primaryColor : theme.colors.outline
        },
        disabled ? styles.disabledAction : null
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={hint}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? <ActivityIndicator color={primary ? primaryTextColor : primaryColor} size="small" /> : null}
      <Text style={[styles.actionText, { color: primary ? primaryTextColor : primaryColor }, disabled && !primary ? { color: disabledTextColor } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function FeedItemCard({ item, settings, onOpen, onToggleSaved, onCheckpoint }: FeedItemCardProps) {
  const theme = useTheme();
  const playback = usePlayback();
  const payload = buildFeedItemAccessibility(item);
  const showThumbnail = settings?.showThumbnails && !settings.hideThumbnailsForLowVision && item.thumbnailURL;
  const summary = summarizeItem(item, settings?.previewLength ?? 3);
  const publishedText = relativePublishedText(item.publishedAt).replace(/\.$/, "");
  const isPodcastLoading = playback.loadingItemID === item.id;
  const isAnyPodcastLoading = playback.isLoading;
  const isCurrentPodcast = playback.currentItem?.id === item.id;
  const playLabel = isPodcastLoading ? "Loading" : isCurrentPodcast && playback.isPlaying ? "Playing" : "Play";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.82}
        onPress={() => onOpen(item)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={payload.label}
        accessibilityHint={payload.hint}
        accessibilityValue={payload.value ? { text: payload.value } : undefined}
      >
        <View style={styles.headerRow}>
          <Pill label={item.contentType} />
          {item.isSaved ? <Pill label="Saved" /> : null}
          {item.isNewRelativeToCheckpoint ? <Pill label="New" /> : null}
        </View>
        <View style={styles.bodyRow}>
          {showThumbnail ? (
            <Image source={{ uri: item.thumbnailURL ?? undefined }} style={[styles.thumbnail, { backgroundColor: theme.colors.surfaceVariant }]} accessible accessibilityLabel={`Thumbnail for ${item.title}`} />
          ) : null}
          <View style={styles.textColumn}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
            <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
              {item.authorOrChannel ?? "Unknown Source"} · {publishedText}
            </Text>
            {item.durationSeconds ? <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>Duration {clockString(item.durationSeconds)}</Text> : null}
            {summary ? <Text style={[styles.summary, { color: theme.colors.onSurface }]}>{summary}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <ActionButton
          label={item.isSaved ? "Unsave" : "Save"}
          onPress={() => onToggleSaved(item.id)}
          hint={item.isSaved ? "Double tap to remove this item from saved articles." : "Double tap to save this item for later."}
        />
        <ActionButton
          label="Checkpoint"
          onPress={() => onCheckpoint(item)}
          hint="Double tap to mark items newer than this as new."
        />
        {item.contentType === "podcast" ? (
          <ActionButton
            label={playLabel}
            primary
            onPress={() => playback.playItem(item)}
            disabled={isAnyPodcastLoading || (isCurrentPodcast && playback.isPlaying)}
            loading={isPodcastLoading}
            hint={isPodcastLoading ? "Podcast playback is loading." : "Double tap to start playback in the mini player."}
          />
        ) : (
          <ActionButton
            label="Open"
            primary
            onPress={() => Linking.openURL(item.externalURL ?? item.canonicalURL)}
            hint="Double tap to open this item in the system browser or app."
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  content: {
    padding: 14,
    gap: 10
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  pill: {
    minHeight: 28,
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 10
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700"
  },
  bodyRow: {
    flexDirection: "row",
    gap: 12
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: 6
  },
  textColumn: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24
  },
  meta: {
    fontSize: 14,
    lineHeight: 20
  },
  summary: {
    fontSize: 15,
    lineHeight: 21
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12
  },
  actionButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 8
  },
  disabledAction: {
    opacity: 0.62
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700"
  }
});
