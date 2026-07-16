import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { Source, SourceMeta } from "../domain/models";
import type { SettingsStackParamList } from "../navigation/types";
import { sourceTypeDisplayName } from "../utils/formatting";
import { searchSources } from "../utils/search";

type Props = NativeStackScreenProps<SettingsStackParamList, "SourceLibrary">;

function sourceIcon(source: Source): string {
  if (source.officialStatus === "Official") return "castle";
  switch (source.sourceType) {
    case "youtubeChannel":
      return "youtube";
    case "podcastRSS":
      return "microphone";
    case "redditFeed":
      return "reddit";
    default:
      if (
        source.publisherType === "Reddit Community" ||
        source.publisherType === "Forum"
      )
        return "forum-outline";
      return "newspaper-variant-outline";
  }
}

function SourceRow({
  source,
  unreadCount,
  meta,
  onPress,
}: {
  source: Source;
  unreadCount: number;
  meta?: SourceMeta;
  onPress: () => void;
}) {
  const theme = useTheme();
  const icon = sourceIcon(source);

  const isUnavailable =
    (meta?.failureCount ?? 0) >= 3 &&
    !!meta?.nextRetryAt &&
    Date.now() < new Date(meta.nextRetryAt).getTime();

  const a11yLabel = isUnavailable
    ? `${source.name}. Unavailable.`
    : unreadCount === 1
      ? `${source.name}. 1 new article.`
      : `${source.name}. ${unreadCount} new articles.`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sourceRow,
        {
          backgroundColor: pressed
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
          borderBottomColor: theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Double tap to view articles from this source."
    >
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={theme.colors.primary}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <View style={styles.sourceInfo}>
        <Text
          style={[styles.sourceName, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {source.name}
        </Text>
        <Text
          style={[
            styles.sourceType,
            {
              color: isUnavailable
                ? theme.colors.error
                : theme.colors.onSurfaceVariant,
            },
          ]}
          numberOfLines={1}
        >
          {isUnavailable
            ? "Unavailable"
            : sourceTypeDisplayName(source.sourceType)}
        </Text>
      </View>
      <View style={styles.sourceTrailing}>
        {isUnavailable ? (
          <MaterialCommunityIcons
            name={"alert-circle-outline" as any}
            size={18}
            color={theme.colors.error}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : unreadCount > 0 ? (
          <View
            style={[styles.badge, { backgroundColor: theme.colors.primary }]}
          >
            <Text
              style={[styles.badgeText, { color: theme.colors.onPrimary }]}
            >
              {unreadCount > 99 ? "99+" : String(unreadCount)}
            </Text>
          </View>
        ) : null}
        <MaterialCommunityIcons
          name={"chevron-right" as any}
          size={18}
          color={theme.colors.onSurfaceVariant}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </Pressable>
  );
}

export function SourceLibraryScreen({ navigation }: Props) {
  const app = useAppContext();
  const theme = useTheme();
  const { playSelect, playConfirm } = useSounds();

  const [localQuery, setLocalQuery] = React.useState("");

  const enabledSources = useMemo(
    () => app.sources.filter((s) => s.isEnabled),
    [app.sources],
  );

  const filteredSources = useMemo(
    () => searchSources(enabledSources, localQuery),
    [enabledSources, localQuery],
  );

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
    const groupOrder: Array<{
      key: string;
      title: string;
      match: (s: Source) => boolean;
    }> = [
      {
        key: "official",
        title: "Official",
        match: (s) => s.officialStatus === "Official",
      },
      {
        key: "news",
        title: "Articles",
        match: (s) =>
          s.sourceType === "rssArticle" &&
          s.officialStatus !== "Official" &&
          !s.categoryTags.includes("international"),
      },
      {
        key: "international",
        title: "International",
        match: (s) =>
          s.sourceType === "rssArticle" &&
          s.categoryTags.includes("international"),
      },
      {
        key: "video",
        title: "Videos",
        match: (s) =>
          s.sourceType === "youtubeChannel" && s.officialStatus !== "Official",
      },
      {
        key: "podcast",
        title: "Podcasts",
        match: (s) => s.sourceType === "podcastRSS",
      },
      {
        key: "community",
        title: "Social",
        match: (s) =>
          s.sourceType === "redditFeed" ||
          s.publisherType === "Reddit Community" ||
          s.publisherType === "Forum",
      },
    ];
    const assigned = new Set<string>();
    const result: { title: string; data: Source[] }[] = [];
    for (const group of groupOrder) {
      const data = filteredSources.filter(
        (s) => !assigned.has(s.id) && group.match(s),
      );
      data.forEach((s) => assigned.add(s.id));
      if (data.length > 0) result.push({ title: group.title, data });
    }
    const remaining = filteredSources.filter((s) => !assigned.has(s.id));
    if (remaining.length > 0)
      result.push({ title: "Articles", data: remaining });
    return result;
  }, [filteredSources]);

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(source) => source.id}
        renderItem={({ item }) => (
          <SourceRow
            source={item}
            unreadCount={unreadBySourceID.get(item.id) ?? 0}
            meta={app.sourceMeta[item.id]}
            onPress={() => {
              playSelect();
              navigation.navigate("SourceFeed", { source: item });
            }}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text
            style={[
              styles.sectionHeader,
              {
                color: theme.colors.onSurfaceVariant,
                backgroundColor: theme.colors.background,
              },
            ]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <PlainSearchField
              value={localQuery}
              onChangeText={setLocalQuery}
              placeholder="Filter sources…"
              accessibilityLabel="Filter sources"
              accessibilityHint="Type to filter your source list."
            />
            <Pressable
              onPress={() => {
                playConfirm();
                navigation.navigate("SourceManage");
              }}
              style={({ pressed }) => [
                styles.manageRow,
                {
                  backgroundColor: pressed
                    ? theme.colors.surfaceVariant
                    : theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Manage Sources"
              accessibilityHint="Double tap to enable or disable sources."
            >
              <MaterialCommunityIcons
                name={"tune-variant" as any}
                size={18}
                color={theme.colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text
                style={[
                  styles.manageText,
                  { color: theme.colors.primary },
                ]}
              >
                Manage Sources
              </Text>
              <MaterialCommunityIcons
                name={"chevron-right" as any}
                size={18}
                color={theme.colors.onSurfaceVariant}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </Pressable>
            {enabledSources.length === 0 ? (
              <Text
                style={[
                  styles.emptyHint,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No sources enabled. Tap Manage Sources to add some.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          filteredSources.length === 0 && localQuery.length > 0 ? (
            <Text
              style={[
                styles.emptyHint,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No sources match "{localQuery}"
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
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  list: {
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceInfo: {
    flex: 1,
    gap: 2,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: "600",
  },
  sourceType: {
    fontSize: 13,
  },
  sourceTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 50,
  },
  manageText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
