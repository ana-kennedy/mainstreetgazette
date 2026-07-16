import React, { useEffect, useRef } from "react";
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  ActionSheetIOS,
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { openBrowserAsync } from "expo-web-browser";
import type { FeedItem, UserSettings } from "../domain/models";
import { useSounds } from "../context/SoundContext";
import { useHaptics } from "../hooks/useHaptics";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { useDynamicType } from "../hooks/useDynamicType";
import { useSystemAccessibility } from "../hooks/useSystemAccessibility";
import { useScreenReaderEnabled } from "../hooks/useScreenReaderEnabled";
import { buildFeedItemAccessibility, isAccessibilityTopic } from "../utils/accessibility";
import { clockString, contentTypeDisplayName, relativePublishedText, summarizeItem } from "../utils/formatting";

// Loaded at runtime — falls back gracefully in Expo Go where the native module is unavailable.
let NativeMenuView: React.ComponentType<{
  title: string;
  actions: object[];
  onPressAction: (e: { nativeEvent: { event: string } }) => void;
  shouldOpenOnLongPress?: boolean;
  children: React.ReactNode;
}> | null = null;
try {
  NativeMenuView = require("@react-native-menu/menu").MenuView;
} catch {}

// Tracks item IDs that have already played their entrance animation this session.
// Prevents the animation from replaying when FlatList virtualisation remounts cards.
const animatedItemIDs = new Set<string>();

interface FeedItemCardProps {
  item: FeedItem;
  settings: UserSettings | null;
  displayMode?: "full" | "minimal";
  sourceName: string;
  onOpen: (item: FeedItem) => void;
  onPlay?: (item: FeedItem) => void;
  onQueue?: (item: FeedItem) => void;
  onRemoveFromQueue?: (itemID: string) => void;
  onToggleSaved: (itemID: string) => void;
  onMarkRead?: (itemID: string) => void;
  onMarkUnread?: (itemID: string) => void;
  onMuteSource?: (sourceID: string) => void;
  whyRecommended?: string;
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
  onRemoveFromQueue,
  onToggleSaved,
  onMarkRead,
  onMarkUnread,
  onMuteSource,
  whyRecommended,
  focusRef
}: FeedItemCardProps) {
  const theme = useTheme();
  const { playSelect, playSave, playUnsave } = useSounds();
  const haptics = useHaptics();
  const reduceMotion = useReduceMotion();
  const { isLargeText, isExtraLargeText } = useDynamicType();
  const { isBoldText, isGrayscale } = useSystemAccessibility();
  const screenReaderEnabled = useScreenReaderEnabled();
  const { t } = useTranslation();

  // The native context-menu wrapper (@react-native-menu/menu) relies on a physical
  // long-press gesture and, on iOS, renders an unlabeled SwiftUI trigger view that
  // VoiceOver announces as "Unimplemented" — and it shadows this card's own
  // accessibilityActions, making the VoiceOver rotor's Actions menu unreachable.
  // With a screen reader on, skip the wrapper entirely and rely on
  // accessibilityActions (rotor) plus the ActionSheet/Alert long-press fallback below.
  const useNativeMenu = Boolean(NativeMenuView) && !screenReaderEnabled;

  const alreadySeen = animatedItemIDs.has(item.id);
  const fadeAnim = useRef(new Animated.Value(alreadySeen ? 1 : 0)).current;
  useEffect(() => {
    if (animatedItemIDs.has(item.id)) return;
    animatedItemIDs.add(item.id);
    if (reduceMotion) {
      fadeAnim.setValue(1);
    } else {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = buildFeedItemAccessibility(
    item,
    sourceName,
    settings?.simplifiedLayoutEnabled ? "simple" : settings?.announcementLevel ?? "all"
  );
  const isMinimal = displayMode === "minimal";
  const isSimplified = settings?.simplifiedLayoutEnabled ?? false;
  const isCompact = settings?.cardDensity === "compact";
  const isSpacious = settings?.cardDensity === "spacious";
  const cardPadding = isCompact ? 7 : isSpacious ? 13 : 10;
  const cardMarginVertical = isCompact ? 2 : isSpacious ? 6 : 4;
  const textColumnGap = isCompact ? 2 : isSpacious ? 4 : 3;
  const showBoldMetadata = (settings?.lowVisionBoldMetadata ?? false) || isBoldText;
  const artworkDensity = settings?.artworkDensity ?? "full";
  const showThumbnail =
    !isMinimal &&
    !isSimplified &&
    !isLargeText &&
    artworkDensity !== "textFirst" &&
    !settings?.hideThumbnailsForLowVision &&
    item.thumbnailURL;
  const thumbnailSize = artworkDensity === "reduced" ? 44 : 62;
  const showSecondaryMeta = !isSimplified && !isExtraLargeText;
  const summary = !isSimplified ? summarizeItem(item, settings?.previewLength ?? 3) : null;
  const publishedText = relativePublishedText(item.publishedAt).replace(/\.$/, "");
  const authorText = item.authorOrChannel && item.authorOrChannel !== sourceName ? item.authorOrChannel : null;
  const contentLabel = contentTypeDisplayName(item.contentType);
  const hasAccessibilityTopic = isAccessibilityTopic(item);

  const handleOpen = async () => {
    playSelect();
    onMarkRead?.(item.id);
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

  const menuActions = [
    {
      id: "activate",
      title: item.contentType === "podcast" ? t("feed.play") : t("feed.open"),
      image: Platform.select({ ios: item.contentType === "podcast" ? "play.fill" : "arrow.up.right.square" }),
    },
    ...(item.contentType === "podcast" && onRemoveFromQueue
      ? [{ id: "remove-queue", title: t("feed.removeFromQueue"), image: Platform.select({ ios: "text.badge.minus" }) }]
      : item.contentType === "podcast"
        ? [{ id: "queue", title: t("feed.addToQueue"), image: Platform.select({ ios: "text.badge.plus" }) }]
        : []),
    {
      id: "save",
      title: item.isSaved
        ? t("feed.removeFromSaved", { type: contentLabel })
        : t("feed.saveForLater", { type: contentLabel }),
      image: Platform.select({ ios: item.isSaved ? "bookmark.slash" : "bookmark" }),
    },
    ...(!item.isRead && onMarkRead
      ? [{ id: "mark-read", title: t("a11y.markRead"), image: Platform.select({ ios: "checkmark.circle" }) }]
      : []),
    ...(item.isRead && onMarkUnread
      ? [{ id: "mark-unread", title: t("a11y.markUnread"), image: Platform.select({ ios: "circle" }) }]
      : []),
    {
      id: "copy-link",
      title: t("feed.copyLink"),
      image: Platform.select({ ios: "link" }),
    },
    {
      id: "view-web",
      title: t("feed.viewOnWeb"),
      image: Platform.select({ ios: "safari" }),
    },
    {
      id: "share",
      title: t("feed.share", { type: contentLabel }),
      image: Platform.select({ ios: "square.and.arrow.up" }),
    },
    ...(onMuteSource
      ? [{ id: "mute-source", title: t("feed.muteSource", { name: sourceName }), image: Platform.select({ ios: "bell.slash" }) }]
      : []),
  ];

  const handleMenuAction = ({ nativeEvent: { event } }: { nativeEvent: { event: string } }) => {
    switch (event) {
      case "activate": handleOpen(); break;
      case "queue": onQueue?.(item); break;
      case "remove-queue": onRemoveFromQueue?.(item.id); break;
      case "save":
        if (item.isSaved) { playUnsave(); haptics.light(); } else { playSave(); haptics.success(); }
        onToggleSaved(item.id);
        break;
      case "mark-read": onMarkRead?.(item.id); break;
      case "mark-unread": onMarkUnread?.(item.id); break;
      case "copy-link":
        Clipboard.setStringAsync(item.canonicalURL).then(() => {
          AccessibilityInfo.announceForAccessibility(t("feed.linkCopied"));
        });
        break;
      case "view-web": Linking.openURL(item.canonicalURL); break;
      case "share":
        Share.share(
          Platform.OS === "ios"
            ? { url: item.canonicalURL, title: item.title }
            : { message: item.canonicalURL, title: item.title }
        );
        break;
      case "mute-source":
        onMuteSource?.(item.sourceID);
        haptics.light();
        AccessibilityInfo.announceForAccessibility(t("feed.sourceMuted", { name: sourceName }));
        break;
    }
  };

  // Fallback long-press for Expo Go / environments without the native context menu.
  const handleLongPressFallback = () => {
    haptics.light();
    const fallbackActions = [
      { label: item.contentType === "podcast" ? t("feed.play") : t("feed.open"), id: "activate" },
      ...(item.contentType === "podcast" && onRemoveFromQueue
        ? [{ label: t("feed.removeFromQueue"), id: "remove-queue" }]
        : item.contentType === "podcast"
          ? [{ label: t("feed.addToQueue"), id: "queue" }]
          : []),
      {
        label: item.isSaved
          ? t("feed.removeFromSaved", { type: contentLabel })
          : t("feed.saveForLater", { type: contentLabel }),
        id: "save",
      },
      ...(!item.isRead && onMarkRead ? [{ label: t("a11y.markRead"), id: "mark-read" }] : []),
      ...(item.isRead && onMarkUnread ? [{ label: t("a11y.markUnread"), id: "mark-unread" }] : []),
      { label: t("feed.share", { type: contentLabel }), id: "share" },
      ...(onMuteSource ? [{ label: t("feed.muteSource", { name: sourceName }), id: "mute-source" }] : []),
    ];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: item.title,
          options: [...fallbackActions.map((a) => a.label), t("common.dismiss")],
          cancelButtonIndex: fallbackActions.length,
        },
        (index) => {
          if (index < fallbackActions.length) {
            handleMenuAction({ nativeEvent: { event: fallbackActions[index].id } });
          }
        }
      );
    } else {
      Alert.alert(
        item.title,
        undefined,
        [
          ...fallbackActions.map((a) => ({
            text: a.label,
            onPress: () => handleMenuAction({ nativeEvent: { event: a.id } }),
          })),
          { text: t("common.dismiss"), style: "cancel" as const },
        ]
      );
    }
  };

  // Braille-optimised action list: short labels for 40-char display lines.
  const brailleActions: Array<{ name: string; label: string }> = [
    { name: "activate", label: item.contentType === "podcast" ? t("feed.play") : t("feed.open") },
    ...(item.contentType === "podcast" && onRemoveFromQueue
      ? [{ name: "remove-queue", label: t("a11y.removeQueue") }]
      : item.contentType === "podcast"
        ? [{ name: "queue", label: t("a11y.queue") }]
        : []),
    { name: "save", label: item.isSaved ? t("a11y.unsave") : t("a11y.save") },
    ...(!item.isRead && onMarkRead ? [{ name: "mark-read", label: t("a11y.markRead") }] : []),
    ...(item.isRead && onMarkUnread ? [{ name: "mark-unread", label: t("a11y.markUnread") }] : []),
    ...(item.summary ? [{ name: "summary", label: t("a11y.summary") }] : []),
    { name: "share", label: t("a11y.share") },
    ...(onMuteSource ? [{ name: "mute-source", label: t("a11y.muteSource") }] : []),
  ];

  const handleContextAccessibilityAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    switch (actionName) {
      case "activate": handleOpen(); break;
      case "queue": onQueue?.(item); break;
      case "remove-queue": onRemoveFromQueue?.(item.id); break;
      case "save":
        if (item.isSaved) { playUnsave(); haptics.light(); } else { playSave(); haptics.success(); }
        onToggleSaved(item.id);
        break;
      case "mark-read":
        onMarkRead?.(item.id);
        haptics.light();
        break;
      case "mark-unread":
        onMarkUnread?.(item.id);
        haptics.light();
        break;
      case "summary":
        if (item.summary) AccessibilityInfo.announceForAccessibility(item.summary);
        break;
      case "share":
        Share.share(
          Platform.OS === "ios"
            ? { url: item.canonicalURL, title: item.title }
            : { message: item.canonicalURL, title: item.title }
        );
        break;
      case "mute-source":
        onMuteSource?.(item.sourceID);
        haptics.light();
        AccessibilityInfo.announceForAccessibility(t("feed.sourceMuted", { name: sourceName }));
        break;
    }
  };

  const cardHint =
    Platform.OS === "ios"
      ? item.contentType === "article"
        ? t("feed.openHintIosArticle")
        : item.contentType === "podcast"
          ? t("feed.openHintIosPodcast")
          : t("feed.openHintIosVideo")
      : t("feed.openAndroid");

  const pillBg = theme.colors.surfaceVariant;
  const pillFg = theme.colors.onSurfaceVariant;
  const savedPillBg = theme.colors.primaryContainer ?? theme.colors.surfaceVariant;
  const savedPillFg = theme.colors.onPrimaryContainer ?? theme.colors.onSurfaceVariant;

  const cardBody = (
    <TouchableOpacity
      ref={focusRef}
      style={[styles.content, { padding: cardPadding }]}
      activeOpacity={0.8}
      onPress={handleOpen}
      onLongPress={!useNativeMenu ? handleLongPressFallback : undefined}
      delayLongPress={!useNativeMenu ? 500 : undefined}
      accessible
      accessibilityRole="button"
      accessibilityLabel={whyRecommended ? `${payload.label} ${whyRecommended}.` : payload.label}
      accessibilityHint={cardHint}
      accessibilityValue={payload.value ? { text: payload.value } : undefined}
      accessibilityActions={brailleActions}
      onAccessibilityAction={handleContextAccessibilityAction}
    >
      <View style={styles.bodyRow}>
        <View style={[styles.textColumn, { gap: textColumnGap }]}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>

          {/* Source · Type · date — secondary line below the headline */}
          <View style={styles.metaTopRow}>
            <Text
              style={[styles.sourceName, { color: theme.colors.primary, fontWeight: showBoldMetadata ? "700" : "600" }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
            >
              {sourceName}
            </Text>
            {!isSimplified ? (
              <>
                <Text style={[styles.metaDot, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>·</Text>
                <Text style={[styles.publishedText, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>
                  {contentLabel}
                </Text>
              </>
            ) : null}
            <Text style={[styles.metaDot, { color: theme.colors.onSurfaceVariant }]} maxFontSizeMultiplier={1.4}>·</Text>
            <Text
              style={[styles.publishedText, { color: theme.colors.onSurfaceVariant, fontWeight: showBoldMetadata ? "700" : "400" }]}
              maxFontSizeMultiplier={1.4}
            >
              {publishedText}
            </Text>
          </View>

          {!isMinimal && showSecondaryMeta && authorText ? (
            <Text style={[styles.metaLine, { color: theme.colors.onSurfaceVariant }]}>
              {t("feed.by", { name: authorText })}
            </Text>
          ) : null}
          {!isMinimal && showSecondaryMeta && item.durationSeconds ? (
            <Text style={[styles.metaLine, { color: theme.colors.onSurfaceVariant }]}>
              {clockString(item.durationSeconds)}
            </Text>
          ) : null}
          {!isMinimal && summary ? (
            <Text style={[styles.summary, { color: theme.colors.onSurface }]}>{summary}</Text>
          ) : null}

          {whyRecommended ? (
            <Text
              style={[styles.whyRecommended, { color: theme.colors.primary }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              numberOfLines={1}
            >
              {whyRecommended}
            </Text>
          ) : null}

          {!isMinimal ? (
            <View
              style={styles.pillRow}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {!isSimplified && item.isSaved ? (
                <TypePill label={t("feed.savedPill")} color={savedPillBg} textColor={savedPillFg} />
              ) : null}
              {isGrayscale && item.isNewRelativeToCheckpoint ? (
                <TypePill label={t("a11y.new").replace(".", "")} color={pillBg} textColor={pillFg} />
              ) : null}
              {hasAccessibilityTopic ? (
                <TypePill label="Accessibility" color={pillBg} textColor={pillFg} />
              ) : null}
            </View>
          ) : null}
        </View>

        {showThumbnail ? (
          <Image
            source={{ uri: item.thumbnailURL ?? undefined }}
            style={[
              styles.thumbnail,
              { backgroundColor: theme.colors.surfaceVariant, width: thumbnailSize, height: thumbnailSize },
            ]}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, marginVertical: cardMarginVertical },
        item.isNewRelativeToCheckpoint && !isMinimal && !isSimplified
          ? { borderLeftColor: theme.colors.primary, borderLeftWidth: 3 }
          : null,
        { opacity: fadeAnim }
      ]}
    >
      {useNativeMenu && NativeMenuView ? (
        <NativeMenuView
          title={item.title}
          actions={menuActions}
          onPressAction={handleMenuAction}
          shouldOpenOnLongPress
        >
          {cardBody}
        </NativeMenuView>
      ) : cardBody}
    </Animated.View>
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
  prev.onMarkRead === next.onMarkRead &&
  prev.onMarkUnread === next.onMarkUnread &&
  prev.onMuteSource === next.onMuteSource
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
  whyRecommended: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3
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
});
