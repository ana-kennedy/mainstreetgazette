import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { Source, SourceMeta } from "../domain/models";
import type { SourcesStackParamList } from "../navigation/types";
import { relativePublishedText, sourceTypeDisplayName } from "../utils/formatting";
import { isHighVolumeSource } from "../services/feedEngine";
import { searchSources } from "../utils/search";

type Props = NativeStackScreenProps<SourcesStackParamList, "SourcesHome">;

function sourceIcon(source: Source): string {
  if (source.officialStatus === "Official") return "castle";
  switch (source.sourceType) {
    case "youtubeChannel": return "youtube";
    case "podcastRSS": return "microphone";
    case "redditFeed": return "reddit";
    default:
      if (source.publisherType === "Reddit Community" || source.publisherType === "Forum") return "forum-outline";
      return "newspaper-variant-outline";
  }
}

function SourceRow({
  source,
  unreadCount,
  meta,
  onPress
}: {
  source: Source;
  unreadCount: number;
  meta?: SourceMeta;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const icon = sourceIcon(source);

  const isUnavailable =
    (meta?.failureCount ?? 0) >= 3 &&
    !!meta?.nextRetryAt &&
    Date.now() < new Date(meta.nextRetryAt).getTime();

  const isHighVolume = isHighVolumeSource(meta ?? {}, source.sourceType);

  const lastFetchedText = !isUnavailable && meta?.lastFetchedAt
    ? `Updated ${relativePublishedText(meta.lastFetchedAt).replace(/\.$/, "")}`
    : null;

  const subtitleText = isUnavailable
    ? t("sources.unavailable")
    : lastFetchedText ?? sourceTypeDisplayName(source.sourceType);

  const a11yLabel = isUnavailable
    ? t("sources.sourceA11yUnavailable", { name: source.name })
    : unreadCount === 1
      ? t("sources.sourceA11y_one", { name: source.name, count: 1 })
      : t("sources.sourceA11y_other", { name: source.name, count: unreadCount });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sourceRow,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderBottomColor: theme.colors.outline
        }
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t("sources.sourceHint")}
    >
      <View style={[styles.iconWrapper, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={theme.colors.primary}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <View style={styles.sourceInfo}>
        <Text style={[styles.sourceName, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {source.name}
        </Text>
        <Text
          style={[styles.sourceType, { color: isUnavailable ? theme.colors.error : theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {subtitleText}
        </Text>
      </View>
      <View style={styles.sourceTrailing}>
        {isUnavailable ? (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={theme.colors.error}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : isHighVolume ? (
          <MaterialCommunityIcons
            name={"clock-alert-outline" as any}
            size={16}
            color={theme.colors.onSurfaceVariant}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>
              {unreadCount > 99 ? "99+" : String(unreadCount)}
            </Text>
          </View>
        ) : null}
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={theme.colors.onSurfaceVariant}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </Pressable>
  );
}

function ManageRow({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.manageRow,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface, borderColor: theme.colors.outline }
      ]}
      accessibilityRole="button"
      accessibilityLabel={t("sources.manageLabel")}
      accessibilityHint={t("sources.manageHint")}
    >
      <MaterialCommunityIcons
        name="tune-variant"
        size={18}
        color={theme.colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[styles.manageText, { color: theme.colors.primary }]}>{t("sources.manageLabel")}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export function SourcesScreen({ navigation }: Props) {
  const app = useAppContext();
  const theme = useTheme();
  const { playSelect, playConfirm } = useSounds();
  const { t } = useTranslation();

  const enabledSources = useMemo(
    () => app.sources.filter((s) => s.isEnabled),
    [app.sources]
  );

  const filteredSources = useMemo(
    () => searchSources(enabledSources, app.searchQuery),
    [enabledSources, app.searchQuery]
  );

  // Count unread items per source
  const unreadBySourceID = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of app.items) {
      if (item.isNewRelativeToCheckpoint && !item.isRead) {
        map.set(item.sourceID, (map.get(item.sourceID) ?? 0) + 1);
      }
    }
    return map;
  }, [app.items]);

  const sections = useMemo(() => {
    // Group sources by publisherType from catalog metadata, falling back to sourceType
    const groupOrder: Array<{ key: string; title: string; match: (s: Source) => boolean }> = [
      { key: "official", title: t("sources.section.official"), match: (s) => s.officialStatus === "Official" },
      { key: "news", title: t("sources.section.articles"), match: (s) => s.sourceType === "rssArticle" && s.officialStatus !== "Official" && !s.categoryTags.includes("international") },
      { key: "international", title: t("sources.section.international"), match: (s) => s.sourceType === "rssArticle" && s.categoryTags.includes("international") },
      { key: "video", title: t("sources.section.videos"), match: (s) => s.sourceType === "youtubeChannel" && s.officialStatus !== "Official" },
      { key: "podcast", title: t("sources.section.podcasts"), match: (s) => s.sourceType === "podcastRSS" },
      { key: "community", title: t("sources.section.social"), match: (s) => s.sourceType === "redditFeed" || s.publisherType === "Reddit Community" || s.publisherType === "Forum" },
    ];
    const assigned = new Set<string>();
    const result: { title: string; data: Source[] }[] = [];
    for (const group of groupOrder) {
      const data = filteredSources.filter((s) => !assigned.has(s.id) && group.match(s));
      data.forEach((s) => assigned.add(s.id));
      if (data.length > 0) result.push({ title: group.title, data });
    }
    // Catch-all for any sources that didn't match above groups
    const remaining = filteredSources.filter((s) => !assigned.has(s.id));
    if (remaining.length > 0) result.push({ title: t("sources.section.articles"), data: remaining });
    return result;
  }, [filteredSources, t]);

  const totalUnread = useMemo(
    () => Array.from(unreadBySourceID.values()).reduce((sum, n) => sum + n, 0),
    [unreadBySourceID]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel={totalUnread > 0 ? t("sources.totalA11y", { count: totalUnread }) : t("sources.title")}>
          <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]} accessible={false}>
            {t("sources.title")}
          </Text>
          {totalUnread > 0 ? (
            <View style={[styles.totalBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.totalBadgeText, { color: theme.colors.onSurfaceVariant }]}>
                {t("sources.totalBadge", { count: totalUnread })}
              </Text>
            </View>
          ) : null}
        </View>
        <PlainSearchField
          value={app.searchQuery}
          onChangeText={app.setSearchQuery}
          placeholder={t("sources.searchPlaceholder")}
          accessibilityLabel={t("sources.searchA11y")}
          accessibilityHint={t("sources.searchHint")}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(source) => source.id}
        renderItem={({ item }) => (
          <SourceRow
            source={item}
            unreadCount={unreadBySourceID.get(item.id) ?? 0}
            meta={app.sourceMeta[item.id]}
            onPress={() => { playSelect(); navigation.navigate("SourceFeed", { source: item }); }}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text
            style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant, backgroundColor: theme.colors.background }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        ListHeaderComponent={
          <View style={styles.manageHeader}>
            <ManageRow onPress={() => { playConfirm(); navigation.navigate("SourceManage"); }} />
            {enabledSources.length === 0 ? (
              <Text style={[styles.emptyHint, { color: theme.colors.onSurfaceVariant }]}>
                {t("sources.noEnabled")}
              </Text>
            ) : null}
          </View>
        }
        ListFooterComponent={null}
        ListEmptyComponent={
          filteredSources.length === 0 && app.searchQuery.length > 0 ? (
            <Text style={[styles.emptyHint, { color: theme.colors.onSurfaceVariant }]}>
              {t("sources.noMatch", { query: app.searchQuery })}
            </Text>
          ) : null
        }
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5
  },
  totalBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: "600"
  },
  list: {
    paddingBottom: 24
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  sourceInfo: {
    flex: 1,
    gap: 2
  },
  sourceName: {
    fontSize: 16,
    fontWeight: "600"
  },
  sourceType: {
    fontSize: 13
  },
  sourceTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  manageHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 50
  },
  manageText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600"
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingVertical: 16
  }
});
