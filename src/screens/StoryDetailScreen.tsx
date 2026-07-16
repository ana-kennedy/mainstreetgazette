import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { openBrowserAsync } from "expo-web-browser";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import type { FeedItem } from "../domain/models";
import type { NewsStackParamList } from "../navigation/types";
import type { ClusteredItem } from "../types/storyTypes";
import { relativePublishedText } from "../utils/formatting";

type Props = NativeStackScreenProps<NewsStackParamList, "StoryDetail">;

function ClusterItemRow({
  ci,
  feedItem,
  onOpenFeedItem,
  onPlay,
}: {
  ci: ClusteredItem;
  feedItem: FeedItem | undefined;
  onOpenFeedItem: (item: FeedItem) => void;
  onPlay: (item: FeedItem) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const publishedText = relativePublishedText(ci.publishedAt).replace(/\.$/, "");

  const handlePress = useCallback(() => {
    if (!feedItem) {
      openBrowserAsync(ci.url).catch(() => {});
      return;
    }
    if (ci.contentType === "video" || ci.contentType === "podcast") {
      onPlay(feedItem);
    } else {
      onOpenFeedItem(feedItem);
    }
  }, [feedItem, ci, onOpenFeedItem, onPlay]);

  const hint =
    ci.contentType === "video" || ci.contentType === "podcast"
      ? t("storyDetail.openHintPlay")
      : t("storyDetail.openHintRead");

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.itemRow, { borderBottomColor: theme.colors.outline }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${ci.title}. ${ci.sourceName}. ${publishedText}`}
      accessibilityHint={hint}
    >
      <View
        style={styles.itemMeta}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[styles.itemSource, { color: theme.colors.primary }]} numberOfLines={1}>
          {ci.sourceName}
        </Text>
        <Text style={[styles.itemTime, { color: theme.colors.onSurfaceVariant }]}>
          {publishedText}
        </Text>
      </View>
      <Text
        style={[styles.itemTitle, { color: theme.colors.onSurface }]}
        numberOfLines={3}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {ci.title}
      </Text>
      <Button
        mode="text"
        compact
        onPress={handlePress}
        style={styles.openButton}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {t("storyDetail.open")}
      </Button>
    </Pressable>
  );
}

export function StoryDetailScreen({ route, navigation }: Props) {
  const { clusterId } = route.params;
  const app = useAppContext();
  const playback = usePlayback();
  const { t } = useTranslation();
  const theme = useTheme();

  const cluster = app.clusters.find((c) => c.clusterId === clusterId);

  const feedItemsByItemId = React.useMemo(() => {
    const map = new Map<string, FeedItem>();
    for (const item of app.items) {
      map.set(item.id, item);
    }
    return map;
  }, [app.items]);

  const handleOpenFeedItem = useCallback((item: FeedItem) => {
    navigation.navigate("FeedDetail", { item });
  }, [navigation]);

  const handlePlay = useCallback((item: FeedItem) => {
    playback.playItem(item);
    navigation.navigate("Player");
  }, [playback, navigation]);

  if (!cluster) {
    return (
      <Screen>
        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
          accessibilityHint={t("common.back")}
        >
          {t("common.back")}
        </Button>
        <View style={styles.empty}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>{t("storyDetail.noItems")}</Text>
        </View>
      </Screen>
    );
  }

  const visibleItems = cluster.items.filter((ci) => !ci.isHiddenDuplicate);
  const primaryItem = visibleItems.find((ci) => ci.clusterRole === "primary");
  const relatedArticles = visibleItems.filter((ci) => ci.clusterRole === "related_article");
  const videos = visibleItems.filter((ci) => ci.clusterRole === "related_video");
  const podcasts = visibleItems.filter((ci) => ci.clusterRole === "related_podcast");
  const communityItems = visibleItems.filter((ci) => ci.clusterRole === "community_discussion");

  const sourceSummary = cluster.officialSourcePresent
    ? `${t("cluster.official")} · ${t("storyDetail.sourcesSummary", { count: cluster.sourceCount })}`
    : t("storyDetail.sourcesSummary", { count: cluster.sourceCount });

  function renderSection(title: string, items: ClusteredItem[]) {
    if (items.length === 0) return null;
    return (
      <>
        <Divider />
        <Text style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
        {items.map((ci) => (
          <ClusterItemRow
            key={ci.itemId}
            ci={ci}
            feedItem={feedItemsByItemId.get(ci.itemId)}
            onOpenFeedItem={handleOpenFeedItem}
            onPlay={handlePlay}
          />
        ))}
      </>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
          accessibilityHint={t("common.back")}
        >
          {t("common.back")}
        </Button>
        {/* Headline block */}
        <View style={styles.headlineBlock} accessible accessibilityRole="header">
          <View style={styles.badgeRow}>
            {cluster.officialSourcePresent && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={[styles.badgeText, { color: theme.colors.onPrimaryContainer }]}>
                  ✦ {t("cluster.official")}
                </Text>
              </View>
            )}
            <Text style={[styles.sourceSummary, { color: theme.colors.onSurfaceVariant }]}>
              {sourceSummary}
            </Text>
          </View>
          <Text style={[styles.headline, { color: theme.colors.onSurface }]}>
            {cluster.canonicalTitle}
          </Text>
          {[...cluster.parks, ...cluster.topics.slice(0, 2)].filter(Boolean).length > 0 && (
            <Text style={[styles.metaLine, { color: theme.colors.onSurfaceVariant }]}>
              {[...cluster.parks, ...cluster.topics.slice(0, 2)].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>

        {/* Primary report */}
        {primaryItem && (
          <>
            <Text style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}>
              {t("storyDetail.primaryArticle")}
            </Text>
            <ClusterItemRow
              ci={primaryItem}
              feedItem={feedItemsByItemId.get(primaryItem.itemId)}
              onOpenFeedItem={handleOpenFeedItem}
              onPlay={handlePlay}
            />
          </>
        )}

        {/* Phase 16: Entity chips — tap to view the entity's full story graph */}
        {cluster.entities.length > 0 ? (
          <>
            <Divider />
            <View style={styles.entityChipSection}>
              <Text style={[styles.entityChipLabel, { color: theme.colors.onSurfaceVariant }]}>
                Related entities
              </Text>
              <View style={styles.entityChipRow}>
                {cluster.entities.slice(0, 5).map((entityName) => (
                  <Pressable
                    key={entityName}
                    onPress={() => navigation.navigate("EntityProfile", { entityName })}
                    style={({ pressed }) => [
                      styles.entityChip,
                      {
                        backgroundColor: pressed
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`View all stories about ${entityName}`}
                    accessibilityHint="Double tap to see all coverage of this entity."
                  >
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurface, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {entityName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {renderSection(t("storyDetail.relatedArticles"), relatedArticles)}
        {renderSection(t("storyDetail.videos"), videos)}
        {renderSection(t("storyDetail.podcasts"), podcasts)}
        {renderSection(t("storyDetail.community"), communityItems)}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  headlineBlock: {
    padding: 16,
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  sourceSummary: {
    fontSize: 13,
  },
  headline: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  metaLine: {
    fontSize: 13,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  itemRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemSource: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  itemTime: {
    fontSize: 12,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  openButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
    marginTop: 2,
  },
  entityChipSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  entityChipLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  entityChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  entityChip: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 200,
  },
});
