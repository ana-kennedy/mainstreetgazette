import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { Source } from "../domain/models";
import type { SourcesStackParamList } from "../navigation/types";
import { sourceTypeDisplayName } from "../utils/formatting";
import { searchSources } from "../utils/search";

type Props = NativeStackScreenProps<SourcesStackParamList, "SourcesHome">;

function sourceIcon(sourceType: Source["sourceType"]): string {
  switch (sourceType) {
    case "youtubeChannel": return "youtube";
    case "podcastRSS": return "microphone";
    case "redditFeed": return "reddit";
    default: return "newspaper-variant-outline";
  }
}

function SourceRow({
  source,
  unreadCount,
  onPress
}: {
  source: Source;
  unreadCount: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const icon = sourceIcon(source.sourceType);

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
      accessibilityLabel={`${source.name}. ${unreadCount} unread ${unreadCount === 1 ? "story" : "stories"}.`}
      accessibilityHint="Double tap to read articles from this source."
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
        <Text style={[styles.sourceType, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {sourceTypeDisplayName(source.sourceType)}
        </Text>
      </View>
      <View style={styles.sourceTrailing}>
        {unreadCount > 0 ? (
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.manageRow,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface, borderColor: theme.colors.outline }
      ]}
      accessibilityRole="button"
      accessibilityLabel="Manage Sources"
      accessibilityHint="Double tap to enable or disable individual sources."
    >
      <MaterialCommunityIcons
        name="tune-variant"
        size={18}
        color={theme.colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[styles.manageText, { color: theme.colors.primary }]}>Manage Sources</Text>
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
      if (item.isNewRelativeToCheckpoint) {
        map.set(item.sourceID, (map.get(item.sourceID) ?? 0) + 1);
      }
    }
    return map;
  }, [app.items]);

  const sections = useMemo(() => {
    const articles = filteredSources.filter((s) => s.sourceType === "rssArticle");
    const videos = filteredSources.filter((s) => s.sourceType === "youtubeChannel");
    const podcasts = filteredSources.filter((s) => s.sourceType === "podcastRSS");
    const social = filteredSources.filter((s) => s.sourceType === "redditFeed");
    const result: { title: string; data: Source[] }[] = [];
    if (articles.length > 0) result.push({ title: "Articles", data: articles });
    if (videos.length > 0) result.push({ title: "Videos", data: videos });
    if (podcasts.length > 0) result.push({ title: "Podcasts", data: podcasts });
    if (social.length > 0) result.push({ title: "Social", data: social });
    return result;
  }, [filteredSources]);

  const totalUnread = useMemo(
    () => Array.from(unreadBySourceID.values()).reduce((sum, n) => sum + n, 0),
    [unreadBySourceID]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel={totalUnread > 0 ? `Sources. ${totalUnread} unread.` : "Sources"}>
          <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]} accessible={false}>
            Sources
          </Text>
          {totalUnread > 0 ? (
            <View style={[styles.totalBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.totalBadgeText, { color: theme.colors.onSurfaceVariant }]}>
                {totalUnread} unread
              </Text>
            </View>
          ) : null}
        </View>
        <PlainSearchField
          value={app.searchQuery}
          onChangeText={app.setSearchQuery}
          placeholder="Search sources"
          accessibilityLabel="Search enabled sources"
          accessibilityHint="Enter words to filter the list of active sources."
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(source) => source.id}
        renderItem={({ item }) => (
          <SourceRow
            source={item}
            unreadCount={unreadBySourceID.get(item.id) ?? 0}
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
        ListHeaderComponent={null}
        ListFooterComponent={
          <View style={styles.footer}>
            <ManageRow onPress={() => { playConfirm(); navigation.navigate("SourceManage"); }} />
            {enabledSources.length === 0 ? (
              <Text style={[styles.emptyHint, { color: theme.colors.onSurfaceVariant }]}>
                No sources are enabled. Tap Manage Sources to turn some on.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          filteredSources.length === 0 && app.searchQuery.length > 0 ? (
            <Text style={[styles.emptyHint, { color: theme.colors.onSurfaceVariant }]}>
              No sources match "{app.searchQuery}".
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
  footer: {
    paddingHorizontal: 16,
    paddingTop: 20,
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
