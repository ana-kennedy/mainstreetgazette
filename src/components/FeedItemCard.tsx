import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  findNodeHandle
} from "react-native";
import { useTheme } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import { openBrowserAsync } from "expo-web-browser";
import type { FeedItem, UserSettings } from "../domain/models";
import { useSounds } from "../context/SoundContext";
import { buildFeedItemAccessibility } from "../utils/accessibility";
import { clockString, relativePublishedText, summarizeItem } from "../utils/formatting";

interface FeedItemCardProps {
  item: FeedItem;
  settings: UserSettings | null;
  displayMode?: "full" | "minimal";
  sourceName: string;
  onOpen: (item: FeedItem) => void;
  onPlay?: (item: FeedItem) => void;
  onQueue?: (item: FeedItem) => void;
  onToggleSaved: (itemID: string) => void;
  onSetMarker: (item: FeedItem) => void;
  focusRef?: React.Ref<View>;
}

function TypePill({ label, color, textColor }: { label: string; color: string; textColor: string }) {
  return (
    <View
      style={[styles.pill, { backgroundColor: color }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function FeedItemCardInner({
  item,
  settings,
  displayMode = "full",
  sourceName,
  onOpen,
  onPlay,
  onQueue,
  onToggleSaved,
  onSetMarker,
  focusRef
}: FeedItemCardProps) {
  const theme = useTheme();
  const { playSelect } = useSounds();
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const firstContextItemRef = useRef<View>(null);
  const payload = buildFeedItemAccessibility(item, sourceName);
  const isMinimal = displayMode === "minimal";
  const showThumbnail = !isMinimal && settings?.showThumbnails && !settings.hideThumbnailsForLowVision && item.thumbnailURL;
  const summary = summarizeItem(item, settings?.previewLength ?? 3);
  const publishedText = relativePublishedText(item.publishedAt).replace(/\.$/, "");
  const authorText = item.authorOrChannel && item.authorOrChannel !== sourceName ? item.authorOrChannel : null;
  const contentLabel = item.contentType === "podcast" ? "Podcast" : item.contentType === "video" ? "Video" : "Article";

  const closeContextMenu = () => setIsContextMenuVisible(false);

  const handleOpen = async () => {
    playSelect();
    const url = item.externalURL ?? item.canonicalURL;
    if (item.contentType === "article") {
      await openBrowserAsync(url, Platform.OS === "ios" && (settings?.preferReaderMode ?? true) ? { readerMode: true } : {});
    } else if (item.contentType === "podcast") {
      if (onPlay) {
        onPlay(item);
      } else {
        onOpen(item);
      }
    } else {
      await openBrowserAsync(url);
    }
  };

  const openHint =
    item.contentType === "article"
      ? "Double tap to open this article in reader view."
      : item.contentType === "podcast"
        ? "Double tap to play this episode."
        : "Double tap to open this video.";

  const contextMenuItems = [
    {
      key: "activate",
      label: item.contentType === "podcast" ? "Play" : "Open",
      hint: openHint,
      onPress: () => { closeContextMenu(); handleOpen(); }
    },
    ...(item.contentType === "podcast" ? [{
      key: "queue",
      label: "Add to Queue",
      hint: "Double tap to add this episode to the playback queue.",
      onPress: () => { closeContextMenu(); onQueue?.(item); }
    }] : []),
    {
      key: "save",
      label: item.isSaved ? "Remove from Saved" : "Save for Later",
      hint: item.isSaved
        ? `Double tap to remove this ${contentLabel.toLowerCase()} from saved.`
        : `Double tap to save this ${contentLabel.toLowerCase()} for later.`,
      onPress: () => { closeContextMenu(); onToggleSaved(item.id); }
    },
    {
      key: "copy-link",
      label: "Copy Link",
      hint: `Double tap to copy the link to your clipboard.`,
      onPress: async () => {
        closeContextMenu();
        await Clipboard.setStringAsync(item.canonicalURL);
        AccessibilityInfo.announceForAccessibility("Link copied to clipboard.");
      }
    },
    {
      key: "view-web",
      label: "View on Web",
      hint: `Double tap to open in your web browser.`,
      onPress: () => { closeContextMenu(); Linking.openURL(item.canonicalURL); }
    },
    {
      key: "share",
      label: `Share ${contentLabel}`,
      hint: `Double tap to open the share sheet.`,
      onPress: async () => {
        closeContextMenu();
        await Share.share(
          Platform.OS === "ios"
            ? { url: item.canonicalURL, title: item.title }
            : { message: item.canonicalURL, title: item.title }
        );
      }
    },
    {
      key: "set-marker",
      label: "Set Marker",
      hint: "Double tap to set a timeline marker at this item.",
      onPress: () => { closeContextMenu(); onSetMarker(item); }
    }
  ];

  const contextAccessibilityActions = contextMenuItems.map((ci) => ({
    name: ci.key,
    label: ci.label
  }));

  const handleContextAccessibilityAction = (event: AccessibilityActionEvent) => {
    const action = contextMenuItems.find((ci) => ci.key === event.nativeEvent.actionName);
    if (action) action.onPress();
  };

  useEffect(() => {
    if (!isContextMenuVisible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(firstContextItemRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 150);
    return () => clearTimeout(timer);
  }, [isContextMenuVisible]);

  const cardHint =
    Platform.OS === "ios"
      ? item.contentType === "article"
        ? "Double tap to open in reader view. Swipe up or down to access Save, Copy Link, Share, and Set Marker."
        : item.contentType === "podcast"
          ? "Double tap to play. Swipe up or down to access Add to Queue, Save, Copy Link, Share, and Set Marker."
          : "Double tap to open video. Swipe up or down to access Save, Copy Link, Share, and Set Marker."
      : "Double tap to open. Double tap and hold for more options.";

  // Pill styling — subtle, not overwhelming
  const pillBg = theme.colors.surfaceVariant;
  const pillFg = theme.colors.onSurfaceVariant;
  const savedPillBg = theme.colors.primaryContainer ?? theme.colors.surfaceVariant;
  const savedPillFg = theme.colors.onPrimaryContainer ?? theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        item.isNewRelativeToCheckpoint && !isMinimal
          ? { borderLeftColor: theme.colors.primary, borderLeftWidth: 3 }
          : null
      ]}
    >
      <TouchableOpacity
        ref={focusRef}
        style={styles.content}
        activeOpacity={0.8}
        onPress={handleOpen}
        onLongPress={() => setIsContextMenuVisible(true)}
        delayLongPress={500}
        accessible
        accessibilityRole="button"
        accessibilityLabel={payload.label}
        accessibilityHint={cardHint}
        accessibilityValue={payload.value ? { text: payload.value } : undefined}
        accessibilityActions={contextAccessibilityActions}
        onAccessibilityAction={handleContextAccessibilityAction}
      >
        <View style={styles.bodyRow}>
          <View style={styles.textColumn}>
            {/* Source + date line above title (editorial style) */}
            <View style={styles.metaTopRow}>
              <Text
                style={[
                  styles.sourceName,
                  {
                    color: theme.colors.primary,
                    fontWeight: settings?.lowVisionBoldMetadata ? "700" : "600"
                  }
                ]}
                numberOfLines={1}
              >
                {sourceName}
              </Text>
              <Text
                style={[
                  styles.metaDot,
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                ·
              </Text>
              <Text
                style={[
                  styles.publishedText,
                  {
                    color: theme.colors.onSurfaceVariant,
                    fontWeight: settings?.lowVisionBoldMetadata ? "700" : "400"
                  }
                ]}
              >
                {publishedText}
              </Text>
            </View>

            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>

            {!isMinimal && authorText ? (
              <Text style={[styles.metaLine, { color: theme.colors.onSurfaceVariant }]}>
                By {authorText}
              </Text>
            ) : null}
            {!isMinimal && item.durationSeconds ? (
              <Text style={[styles.metaLine, { color: theme.colors.onSurfaceVariant }]}>
                {clockString(item.durationSeconds)}
              </Text>
            ) : null}
            {!isMinimal && summary ? (
              <Text style={[styles.summary, { color: theme.colors.onSurface }]}>{summary}</Text>
            ) : null}

            {!isMinimal ? (
              <View
                style={styles.pillRow}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {item.contentType !== "article" ? (
                  <TypePill label={contentLabel} color={pillBg} textColor={pillFg} />
                ) : null}
                {item.isSaved ? (
                  <TypePill label="Saved" color={savedPillBg} textColor={savedPillFg} />
                ) : null}
              </View>
            ) : null}
          </View>

          {showThumbnail ? (
            <Image
              source={{ uri: item.thumbnailURL ?? undefined }}
              style={[styles.thumbnail, { backgroundColor: theme.colors.surfaceVariant }]}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
        </View>
      </TouchableOpacity>

      {isContextMenuVisible ? (
        <Modal
          visible={isContextMenuVisible}
          transparent
          animationType="slide"
          onRequestClose={closeContextMenu}
        >
          <View style={styles.contextMenuContainer} accessibilityViewIsModal>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeContextMenu}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View
              style={[
                styles.contextMenuPanel,
                { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }
              ]}
              accessible={false}
            >
              <View
                style={[styles.contextMenuHandle, { backgroundColor: theme.colors.outline }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text
                style={[styles.contextMenuItemTitle, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {contextMenuItems.map((ci, idx) => (
                <Pressable
                  key={ci.key}
                  ref={idx === 0 ? firstContextItemRef : undefined}
                  onPress={ci.onPress}
                  style={({ pressed }) => [
                    styles.contextMenuItem,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent" }
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel={ci.label}
                  accessibilityHint={ci.hint}
                >
                  <Text style={[styles.contextMenuText, { color: theme.colors.onSurface }]}>{ci.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={closeContextMenu}
                style={({ pressed }) => [
                  styles.contextMenuCloseItem,
                  {
                    backgroundColor: pressed ? theme.colors.outline : theme.colors.surfaceVariant,
                    borderTopColor: theme.colors.outline
                  }
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                accessibilityHint="Double tap to close this action menu."
              >
                <Text style={[styles.contextMenuText, { color: theme.colors.primary, fontWeight: "700" }]}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

// focusRef is intentionally excluded from the equality check — it is always a
// new inline callback but only mutates a ref and never drives re-renders.
export const FeedItemCard = React.memo(FeedItemCardInner, (prev, next) =>
  prev.item === next.item &&
  prev.settings === next.settings &&
  prev.displayMode === next.displayMode &&
  prev.sourceName === next.sourceName &&
  prev.onOpen === next.onOpen &&
  prev.onPlay === next.onPlay &&
  prev.onQueue === next.onQueue &&
  prev.onToggleSaved === next.onToggleSaved &&
  prev.onSetMarker === next.onSetMarker
);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  content: {
    padding: 10
  },
  bodyRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start"
  },
  textColumn: {
    flex: 1,
    gap: 3
  },
  metaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "nowrap"
  },
  sourceName: {
    fontSize: 12,
    letterSpacing: 0.1,
    flexShrink: 1
  },
  metaDot: {
    fontSize: 12
  },
  publishedText: {
    fontSize: 12,
    flexShrink: 1
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    letterSpacing: -0.2
  },
  metaLine: {
    fontSize: 13,
    lineHeight: 18
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2
  },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minHeight: 24,
    justifyContent: "center"
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600"
  },
  thumbnail: {
    width: 62,
    height: 62,
    borderRadius: 7,
    flexShrink: 0
  },
  contextMenuContainer: {
    flex: 1,
    justifyContent: "flex-end"
  },
  contextMenuPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 36,
    paddingTop: 12
  },
  contextMenuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12
  },
  contextMenuItemTitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 8,
    lineHeight: 18
  },
  contextMenuItem: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  contextMenuCloseItem: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  contextMenuText: {
    fontSize: 17,
    lineHeight: 22
  }
});
