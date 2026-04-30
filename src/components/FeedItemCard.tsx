import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  ActivityIndicator,
  Image,
  Linking,
  findNodeHandle,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useTheme } from "react-native-paper";
import type { FeedItem, UserSettings } from "../domain/models";
import { usePlayback } from "../context/PlaybackContext";
import { buildFeedItemAccessibility } from "../utils/accessibility";
import { clockString, relativePublishedText, summarizeItem } from "../utils/formatting";

interface FeedItemCardProps {
  item: FeedItem;
  settings: UserSettings | null;
  sourceName: string;
  onOpen: (item: FeedItem) => void;
  onToggleSaved: (itemID: string) => void;
  onCheckpoint: (item: FeedItem) => void;
  focusRef?: React.Ref<View>;
}

function Pill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.surfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[styles.pillText, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  hint: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const ActionButton = React.forwardRef<View, ActionButtonProps>(function ActionButton(
  { label, hint, onPress, primary = false, disabled = false, loading = false },
  ref
) {
  const theme = useTheme();
  const primaryColor = theme.colors.primary;
  const primaryTextColor = theme.dark ? "#101317" : "#ffffff";
  const secondaryBackground = theme.colors.surface;
  const disabledTextColor = theme.colors.onSurfaceVariant;

  return (
    <TouchableOpacity
      ref={ref}
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
});

export function FeedItemCard({ item, settings, sourceName, onOpen, onToggleSaved, onCheckpoint, focusRef }: FeedItemCardProps) {
  const theme = useTheme();
  const playback = usePlayback();
  const [areActionsVisible, setAreActionsVisible] = useState(false);
  const firstActionRef = useRef<View>(null);
  const payload = buildFeedItemAccessibility(item, sourceName);
  const showThumbnail = settings?.showThumbnails && !settings.hideThumbnailsForLowVision && item.thumbnailURL;
  const summary = summarizeItem(item, settings?.previewLength ?? 3);
  const publishedText = relativePublishedText(item.publishedAt).replace(/\.$/, "");
  const isPodcastLoading = playback.loadingItemID === item.id;
  const isAnyPodcastLoading = playback.isLoading;
  const isCurrentPodcast = playback.currentItem?.id === item.id;
  const playLabel = isPodcastLoading ? "Loading" : isCurrentPodcast && playback.isPlaying ? "Playing" : "Play";
  const authorText = item.authorOrChannel && item.authorOrChannel !== sourceName ? item.authorOrChannel : null;
  const isPlayActionDisabled = isAnyPodcastLoading || (isCurrentPodcast && playback.isPlaying);
  const primaryActionLabel = item.contentType === "podcast" ? playLabel : "Open";
  const primaryActionHint =
    item.contentType === "podcast"
      ? isPodcastLoading
        ? "Podcast playback is loading."
        : "Double tap to start playback in the mini player."
      : "Double tap to open this item in the system browser or app.";

  const runPrimaryAction = () => {
    if (item.contentType === "podcast") {
      if (!isPlayActionDisabled) {
        playback.playItem(item);
      }
      return;
    }
    Linking.openURL(item.externalURL ?? item.canonicalURL);
  };

  const actionItems = [
    {
      key: "save",
      label: item.isSaved ? "Unsave" : "Save",
      hint: item.isSaved ? "Double tap to remove this item from saved articles." : "Double tap to save this item for later.",
      onPress: () => onToggleSaved(item.id)
    },
    {
      key: "primary",
      label: primaryActionLabel,
      hint: primaryActionHint,
      onPress: runPrimaryAction,
      primary: true,
      disabled: item.contentType === "podcast" ? isPlayActionDisabled : false,
      loading: item.contentType === "podcast" ? isPodcastLoading : false
    },
    {
      key: "checkpoint",
      label: "Checkpoint",
      hint: "Double tap to mark items newer than this as new.",
      onPress: () => onCheckpoint(item)
    }
  ];

  const iosAccessibilityActions =
    Platform.OS === "ios"
      ? actionItems
          .filter((action) => !action.disabled)
          .map((action) => ({
            name: `action-${action.key}`,
            label: action.label
          }))
      : undefined;

  const handleActionsAccessibilityAction = (event: AccessibilityActionEvent) => {
    const actionKey = event.nativeEvent.actionName.replace("action-", "");
    const selectedAction = actionItems.find((action) => action.key === actionKey && !action.disabled);
    selectedAction?.onPress();
  };

  useEffect(() => {
    if (!areActionsVisible) {
      return;
    }

    const focusTimeout = setTimeout(() => {
      const node = findNodeHandle(firstActionRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 150);

    return () => clearTimeout(focusTimeout);
  }, [areActionsVisible]);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <TouchableOpacity
        ref={focusRef}
        style={styles.content}
        activeOpacity={0.82}
        onPress={() => onOpen(item)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={payload.label}
        accessibilityHint={payload.hint}
        accessibilityValue={payload.value ? { text: payload.value } : undefined}
      >
        <View style={styles.bodyRow}>
          {showThumbnail ? (
            <Image
              source={{ uri: item.thumbnailURL ?? undefined }}
              style={[styles.thumbnail, { backgroundColor: theme.colors.surfaceVariant }]}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
          <View style={styles.textColumn}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
            <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>{sourceName}</Text>
            {authorText ? <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>By {authorText}</Text> : null}
            <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
              {publishedText}
            </Text>
            {item.durationSeconds ? <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>Duration {clockString(item.durationSeconds)}</Text> : null}
            {summary ? <Text style={[styles.summary, { color: theme.colors.onSurface }]}>{summary}</Text> : null}
            <View style={styles.headerRow}>
              <Pill label={item.contentType} />
              {item.isSaved ? <Pill label="Saved" /> : null}
              {item.isNewRelativeToCheckpoint ? <Pill label="New" /> : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.actions} accessible={false}>
        <TouchableOpacity
          style={[styles.actionsToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          onPress={() => setAreActionsVisible((current) => !current)}
          accessibilityLabel={`Actions button ${areActionsVisible ? "expanded" : "collapsed"}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: areActionsVisible }}
          accessibilityHint={
            Platform.OS === "ios"
              ? areActionsVisible
                ? "Swipe up or down to choose an action. Double tap to collapse."
                : "Swipe up or down to choose an action. Double tap to expand."
              : areActionsVisible
                ? "Double tap to collapse actions."
                : "Double tap to expand actions."
          }
          accessibilityActions={iosAccessibilityActions}
          onAccessibilityAction={Platform.OS === "ios" ? handleActionsAccessibilityAction : undefined}
        >
          <Text style={[styles.actionsTitle, { color: theme.colors.primary }]}>Actions</Text>
        </TouchableOpacity>
        {areActionsVisible ? (
          <View style={styles.actionMenu}>
            {actionItems.map((action, index) => (
              <ActionButton
                key={action.key}
                ref={index === 0 ? firstActionRef : undefined}
                label={action.label}
                primary={action.primary}
                onPress={action.onPress}
                disabled={action.disabled}
                loading={action.loading}
                hint={action.hint}
              />
            ))}
            <ActionButton label="Close actions" onPress={() => setAreActionsVisible(false)} hint="Double tap to collapse actions for this item." />
          </View>
        ) : null}
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
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12
  },
  actionsToggle: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14
  },
  actionMenu: {
    gap: 8
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: "700"
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
