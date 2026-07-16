import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { FeedItem, UserSettings } from "../domain/models";
import type { StoryCluster } from "../types/storyTypes";
import { relativePublishedText } from "../utils/formatting";
import { useReduceMotion } from "../hooks/useReduceMotion";

const animatedClusterIDs = new Set<string>();

interface StoryClusterCardProps {
  cluster: StoryCluster;
  primaryItem: FeedItem | undefined;
  settings: UserSettings | null;
  onOpen: (cluster: StoryCluster) => void;
  onToggleSaved: (itemID: string) => void;
  whyRecommended?: string;
  focusRef?: React.Ref<View>;
}

export function StoryClusterCard({
  cluster,
  primaryItem,
  settings,
  onOpen,
  onToggleSaved,
  whyRecommended,
  focusRef,
}: StoryClusterCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const alreadySeen = animatedClusterIDs.has(cluster.clusterId);
  const fadeAnim = useRef(new Animated.Value(alreadySeen ? 1 : 0)).current;

  useEffect(() => {
    if (animatedClusterIDs.has(cluster.clusterId)) return;
    animatedClusterIDs.add(cluster.clusterId);
    if (reduceMotion) {
      fadeAnim.setValue(1);
    } else {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCompact = settings?.cardDensity === "compact";
  const isSpacious = settings?.cardDensity === "spacious";
  const isRead = primaryItem?.isRead ?? false;
  const isSaved = primaryItem?.isSaved ?? false;
  const publishedText = relativePublishedText(cluster.lastPublishedAt).replace(/\.$/, "");

  const a11yMediaParts: string[] = [];
  if (cluster.articleCount > 0) a11yMediaParts.push(t("cluster.mediaArticles", { count: cluster.articleCount }));
  if (cluster.videoCount > 0) a11yMediaParts.push(t("cluster.mediaVideos", { count: cluster.videoCount }));
  if (cluster.podcastCount > 0) a11yMediaParts.push(t("cluster.mediaPodcasts", { count: cluster.podcastCount }));
  if (cluster.communityCount > 0) a11yMediaParts.push(t("cluster.mediaCommunity", { count: cluster.communityCount }));
  const a11yLabel = [
    cluster.classification?.recommendedDisplayTreatment === "breaking_card" ? t("cluster.breaking") : "",
    cluster.canonicalTitle,
    cluster.officialSourcePresent
      ? t("cluster.officialPlusSources", { count: Math.max(cluster.sourceCount - 1, 0) })
      : t("cluster.sourceCount", { count: cluster.sourceCount }),
    cluster.classification?.isRumorOrSpeculation ? t("cluster.rumor") : "",
    [...cluster.parks, ...cluster.topics.slice(0, 1)].filter(Boolean).join(", "),
    a11yMediaParts.join(", "),
    publishedText,
    isSaved ? t("feed.savedPill") : "",
    whyRecommended ?? "",
  ].filter(Boolean).join(". ");

  const sourceSummary = cluster.officialSourcePresent
    ? t("cluster.officialPlusSources", { count: Math.max(cluster.sourceCount - 1, 0) })
    : t("cluster.sourceCount", { count: cluster.sourceCount });

  const locationLine = [...cluster.parks, ...cluster.topics.slice(0, 1)]
    .filter(Boolean)
    .join(" · ");

  const mediaCounts: string[] = [];
  if (cluster.articleCount > 0) mediaCounts.push(t("cluster.mediaArticles", { count: cluster.articleCount }));
  if (cluster.videoCount > 0) mediaCounts.push(t("cluster.mediaVideos", { count: cluster.videoCount }));
  if (cluster.podcastCount > 0) mediaCounts.push(t("cluster.mediaPodcasts", { count: cluster.podcastCount }));
  if (cluster.communityCount > 0) mediaCounts.push(t("cluster.mediaCommunity", { count: cluster.communityCount }));

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        ref={focusRef as React.Ref<View>}
        onPress={() => onOpen(cluster)}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outline,
            paddingVertical: isCompact ? 10 : isSpacious ? 18 : 14,
          },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={t("cluster.a11yHint")}
        accessibilityActions={[
          { name: "activate", label: t("feed.open") },
          { name: "save", label: isSaved ? t("feed.removeFromSaved") : t("feed.saveForLater") },
        ]}
        onAccessibilityAction={({ nativeEvent: { actionName } }) => {
          if (actionName === "activate") onOpen(cluster);
          if (actionName === "save") onToggleSaved(cluster.primaryItemId);
        }}
      >
        {/* Badge row: Breaking > Official > source count > status */}
        <View style={styles.badgeRow}>
          {cluster.classification?.recommendedDisplayTreatment === "breaking_card" && (
            <View style={[styles.breakingBadge, { backgroundColor: theme.colors.errorContainer ?? theme.colors.error }]}>
              <Text
                style={[styles.breakingBadgeText, { color: theme.colors.onErrorContainer ?? theme.colors.onError }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {t("cluster.breaking")}
              </Text>
            </View>
          )}
          {cluster.officialSourcePresent && (
            <View style={[styles.officialBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text
                style={[styles.officialBadgeText, { color: theme.colors.onPrimaryContainer }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                ✦ {t("cluster.official")}
              </Text>
            </View>
          )}
          {cluster.classification?.isRumorOrSpeculation && (
            <View style={[styles.rumorBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text
                style={[styles.rumorBadgeText, { color: theme.colors.onSurfaceVariant }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {t("cluster.rumor")}
              </Text>
            </View>
          )}
          <View style={[styles.clusterBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text
              style={[styles.clusterBadgeText, { color: theme.colors.onSurfaceVariant }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {sourceSummary}
            </Text>
          </View>
          {cluster.status === "new" && cluster.classification?.recommendedDisplayTreatment !== "breaking_card" && (
            <View style={[styles.newBadge, { backgroundColor: theme.colors.errorContainer ?? theme.colors.primaryContainer }]}>
              <Text
                style={[styles.newBadgeText, { color: theme.colors.onErrorContainer ?? theme.colors.onPrimaryContainer }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {t("cluster.statusNew")}
              </Text>
            </View>
          )}
        </View>

        {/* Headline */}
        <Text
          style={[
            styles.headline,
            {
              color: isRead ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
              fontWeight: isRead ? "400" : "600",
            },
          ]}
          numberOfLines={isCompact ? 2 : 3}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {cluster.canonicalTitle}
        </Text>

        {/* Location + topic line */}
        {locationLine ? (
          <Text
            style={[styles.locationLine, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {locationLine}
          </Text>
        ) : null}

        {whyRecommended ? (
          <Text
            style={[styles.whyRecommended, { color: theme.colors.primary }]}
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {whyRecommended}
          </Text>
        ) : null}

        {/* Media count row — hidden in compact mode */}
        {mediaCounts.length > 0 && !isCompact ? (
          <Text
            style={[styles.mediaCounts, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {mediaCounts.join(" · ")}
          </Text>
        ) : null}

        {/* Timestamp + saved indicator */}
        <View style={styles.metaRow}>
          <Text
            style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {publishedText}
          </Text>
          {isSaved ? (
            <Text
              style={[styles.savedStar, { color: theme.colors.primary }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {" · ★"}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  breakingBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  breakingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  officialBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  officialBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rumorBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  rumorBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    fontStyle: "italic",
  },
  clusterBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clusterBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  newBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
  },
  locationLine: {
    fontSize: 13,
  },
  whyRecommended: {
    fontSize: 12,
    fontWeight: "600",
  },
  mediaCounts: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timestamp: {
    fontSize: 13,
  },
  savedStar: {
    fontSize: 13,
    fontWeight: "600",
  },
});
