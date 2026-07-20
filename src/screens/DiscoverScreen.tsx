import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { EmptyState } from "../components/EmptyState";
import { GazetteCard } from "../components/GazetteCard";
import { SettingsGearButton } from "../components/GazettePageHeader";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { SearchResultRow } from "../components/SearchResultRow";
import { DiscoveryShelf } from "../components/DiscoveryShelf";
import { CollectionShelf } from "../components/CollectionShelf";
import { TrendingSection } from "../components/TrendingSection";
import { EventCalendarSection } from "../components/EventCalendarSection";
import { MediaHubShelf } from "../components/MediaHubShelf";
import { useAppContext } from "../context/AppContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { useCollections } from "../hooks/useCollections";
import type { FeedItem } from "../domain/models";

import { buildDiscoveryFeed } from "../intelligence/phase8";
import type { DiscoveryItem } from "../intelligence/phase8";
import { buildAllCollections, buildAutoCollections } from "../intelligence/phase10";
import collectionsData from "../data/phase10/collections.json";
import type { CollectionDefinition } from "../intelligence/phase10/types";
import { buildTrendingFeed } from "../intelligence/phase11";
import type { TrendingEntry } from "../intelligence/phase11";
import { buildEventCalendar } from "../intelligence/phase13";
import type { CalendarEvent, StaticEventDefinition } from "../intelligence/phase13";
import eventsData from "../data/phase13/events.json";
import { buildMediaHub } from "../intelligence/phase14";
import type { MediaHubItem } from "../intelligence/phase14";

import { searchMainStreetGazette } from "../search/searchEngine";
import { feedItemToSearchableItem, storyClusterToSearchableItem } from "../search/searchAdapter";
import type { SearchResult } from "../search/searchTypes";

export interface DiscoverScreenCoreProps {
  onNavigateToDetail: (item: FeedItem) => void;
  onNavigateToStoryDetail: (clusterId: string) => void;
  onNavigateToCollectionDetail: (collectionId: string) => void;
  onNavigateToParks: (params?: { initialView?: "hub" | "destinations"; initialResortId?: string }) => void;
  onNavigateToDestination: (destinationId: string, kind: "resort" | "cruise") => void;
  onNavigateToParkRadio: () => void;
  onOpenPreferences: () => void;
}

function NavCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navCard,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}.`}
      accessibilityHint="Double tap to open."
    >
      <View style={[styles.navCardIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={theme.colors.onPrimaryContainer}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <View style={styles.navCardText}>
        <Text style={[styles.navCardTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {subtitle}
        </Text>
      </View>
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

export function DiscoverScreenCore({
  onNavigateToDetail,
  onNavigateToStoryDetail,
  onNavigateToCollectionDetail,
  onNavigateToParks,
  onNavigateToDestination,
  onNavigateToParkRadio,
  onOpenPreferences,
}: DiscoverScreenCoreProps) {
  const app = useAppContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const { prefs: personalizationPrefs } = usePersonalization();
  const [searchQuery, setSearchQuery] = useState("");
  const isSearchActive = searchQuery.trim().length > 0;

  const itemByIDMap = useMemo(() => new Map(app.items.map((i) => [i.id, i])), [app.items]);
  const sourceByIDMap = useMemo(() => new Map(app.sources.map((s) => [s.id, s])), [app.sources]);

  const searchableItems = useMemo(() => {
    if (!isSearchActive) return [];
    const clusterItems = app.clusters.map(storyClusterToSearchableItem);
    const feedItems = app.items.map((item) => feedItemToSearchableItem(item, sourceByIDMap.get(item.sourceID)));
    return [...clusterItems, ...feedItems];
  }, [isSearchActive, app.clusters, app.items, sourceByIDMap]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = searchQuery.trim();
    if (!query) return [];
    return searchMainStreetGazette(query, searchableItems, { quickFilter: "all", limit: 80 });
  }, [searchQuery, searchableItems]);

  const handleOpenItem = useCallback(
    (item: FeedItem) => onNavigateToDetail(item),
    [onNavigateToDetail]
  );

  const handleSearchResultPress = useCallback(
    (result: SearchResult) => {
      if (result.resultType === "story") {
        onNavigateToStoryDetail(result.id);
      } else if (result.resultType === "contentItem") {
        const item = itemByIDMap.get(result.id);
        if (item) handleOpenItem(item);
      }
    },
    [onNavigateToStoryDetail, itemByIDMap, handleOpenItem]
  );

  // Phase 8: Discovery Engine — name maps for recommendation labels
  const discoveryEntityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of app.items) {
      for (const match of item.entityMatches ?? []) {
        if (!map.has(match.entityId)) map.set(match.entityId, match.entityName);
      }
    }
    return map;
  }, [app.items]);

  const discoveryTopicNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of app.items) {
      for (const match of item.topicMatches ?? []) {
        if (!map.has(match.topicId)) map.set(match.topicId, match.topicName);
      }
    }
    return map;
  }, [app.items]);

  const discoverySourceNameMap = useMemo(() => new Map(app.sources.map((s) => [s.id, s.name])), [app.sources]);
  const discoveryReadIDs = useMemo(() => new Set(app.readIDs), [app.readIDs]);

  const discoveryFeed = useMemo(() => {
    if (!app.settings?.groupStoriesEnabled) return null;
    if (personalizationPrefs.newsFeedMode !== "personalized") return null;
    return buildDiscoveryFeed({
      clusters: app.clusters,
      prefs: personalizationPrefs,
      readItemIDs: discoveryReadIDs,
      entityNameMap: discoveryEntityNameMap,
      topicNameMap: discoveryTopicNameMap,
      sourceNameMap: discoverySourceNameMap,
    });
  }, [
    app.settings?.groupStoriesEnabled,
    app.clusters,
    personalizationPrefs,
    discoveryReadIDs,
    discoveryEntityNameMap,
    discoveryTopicNameMap,
    discoverySourceNameMap,
  ]);

  const handleDiscoveryItemPress = useCallback(
    (item: DiscoveryItem) => {
      if (item.clusterId) {
        onNavigateToStoryDetail(item.clusterId);
      } else if (item.primaryItemId) {
        const feedItem = itemByIDMap.get(item.primaryItemId);
        if (feedItem) handleOpenItem(feedItem);
      }
    },
    [onNavigateToStoryDetail, itemByIDMap, handleOpenItem]
  );

  // Phase 10: Collections — editorial + auto-generated collections from clusters
  const { savedCollectionIDs, toggleSaveCollection } = useCollections();
  const editorialDefinitions = collectionsData as CollectionDefinition[];

  const liveCollections = useMemo(() => {
    if (!app.settings?.groupStoriesEnabled) return [];
    const editorialIds = new Set(editorialDefinitions.map((d) => d.id));
    const autoDefinitions = buildAutoCollections(app.clusters, editorialIds);
    const allDefinitions = [...editorialDefinitions, ...autoDefinitions];
    return buildAllCollections(app.clusters, allDefinitions, savedCollectionIDs);
  }, [app.settings?.groupStoriesEnabled, app.clusters, editorialDefinitions, savedCollectionIDs]);

  // Phase 11: Trending Engine — scored by velocity, source count, community volume
  const trendingFeed = useMemo(() => {
    if (!app.settings?.groupStoriesEnabled) return null;
    return buildTrendingFeed({
      clusters: app.clusters,
      prefs: personalizationPrefs,
      feedItems: app.items,
      sources: app.sources,
    });
  }, [app.settings?.groupStoriesEnabled, app.clusters, app.items, app.sources, personalizationPrefs]);

  const handleTrendingEntryPress = useCallback(
    (entry: TrendingEntry) => onNavigateToStoryDetail(entry.clusterId),
    [onNavigateToStoryDetail]
  );

  // Phase 13: Event Calendar — surfaces active/upcoming Disney events matched to clusters
  const eventCalendar = useMemo(() => {
    if (!app.settings?.groupStoriesEnabled) return null;
    return buildEventCalendar({
      events: eventsData as StaticEventDefinition[],
      clusters: app.clusters,
    });
  }, [app.settings?.groupStoriesEnabled, app.clusters]);

  const handleEventPress = useCallback(
    (event: CalendarEvent) => {
      if (event.relatedClusterIds.length > 0) onNavigateToStoryDetail(event.relatedClusterIds[0]);
    },
    [onNavigateToStoryDetail]
  );

  // Phase 14: Media Hub — curated videos and podcasts ranked by source trust, freshness, cluster context
  const mediaHub = useMemo(() => {
    if (!app.settings?.groupStoriesEnabled) return null;
    return buildMediaHub({
      feedItems: app.items,
      sources: app.sources,
      clusters: app.clusters,
    });
  }, [app.settings?.groupStoriesEnabled, app.items, app.sources, app.clusters]);

  const handleMediaHubItemPress = useCallback(
    (item: MediaHubItem) => {
      const feedItem = itemByIDMap.get(item.feedItemId);
      if (feedItem) handleOpenItem(feedItem);
    },
    [itemByIDMap, handleOpenItem]
  );

  // Root structure per temp/03_IMPLEMENTATION_PHASES/PHASE_04_EXPLORE_TAB.md: destination
  // cards for WDW, Disneyland Resort, Disney Cruise Line, and international resorts. Disney
  // Cruise Line has no live-data source (themeparks.wiki doesn't cover cruise ships), so its
  // card is an honest "not available yet" notice rather than a dead-end or fabricated data —
  // see PHASE_04_RESULTS.md. A "Disney entertainment" card was left out entirely: there's no
  // dedicated entertainment-destination surface to send it to (that content already lives in
  // the Media Hub shelf below), and building a placeholder for it would violate the
  // Constitution's "never expose an empty promise" rule.
  const destinationCards = useMemo(
    () => [
      {
        id: "wdw",
        title: t("discover.destinations.wdw"),
        subtitle: t("discover.destinations.parkSubtitle"),
        icon: "castle",
        onPress: () => onNavigateToDestination("wdw", "resort"),
      },
      {
        id: "dla",
        title: t("discover.destinations.dla"),
        subtitle: t("discover.destinations.parkSubtitle"),
        icon: "castle",
        onPress: () => onNavigateToDestination("dla", "resort"),
      },
      {
        id: "international",
        title: t("discover.destinations.international"),
        subtitle: t("discover.destinations.parkSubtitle"),
        icon: "earth",
        onPress: () => onNavigateToParks({ initialView: "destinations" }),
      },
      {
        id: "dcl",
        title: t("discover.destinations.dcl"),
        subtitle: t("discover.destinations.dclSubtitle"),
        icon: "ferry",
        onPress: () => onNavigateToDestination("dcl", "cruise"),
      },
    ],
    [t, onNavigateToDestination, onNavigateToParks]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text
            variant="headlineMedium"
            style={[styles.title, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            {t("discover.title")}
          </Text>
          <SettingsGearButton onPress={onOpenPreferences} />
        </View>
        <Text style={[styles.prompt, { color: theme.colors.onSurfaceVariant }]}>
          {t("discover.prompt")}
        </Text>
        <PlainSearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("discover.searchPlaceholder")}
          accessibilityLabel={t("discover.searchPlaceholder")}
          accessibilityHint={t("discover.searchHint")}
        />
      </View>

      {isSearchActive ? (
        <FlatList
          data={searchResults}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <SearchResultRow result={item} onPress={handleSearchResultPress} />}
          ListEmptyComponent={<EmptyState title={t("search.emptyTitle")} body={t("search.emptyBody")} />}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyList : styles.list}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationRow}
          >
            {destinationCards.map((card) => (
              <GazetteCard
                key={card.id}
                onPress={card.onPress}
                accessibilityLabel={`${card.title}. ${card.subtitle}`}
                accessibilityHint="Double tap to explore."
                style={styles.destinationCard}
              >
                <MaterialCommunityIcons
                  name={card.icon as any}
                  size={26}
                  color={theme.colors.primary}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.destinationTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
                  {card.title}
                </Text>
              </GazetteCard>
            ))}
          </ScrollView>

          {trendingFeed && trendingFeed.trendingStories.length > 0 ? (
            <TrendingSection entries={trendingFeed.trendingStories.slice(0, 5)} onPressEntry={handleTrendingEntryPress} />
          ) : null}
          {discoveryFeed && discoveryFeed.sections.length > 0 ? (
            <DiscoveryShelf sections={discoveryFeed.sections} onPressItem={handleDiscoveryItemPress} />
          ) : null}
          {liveCollections.length > 0 ? (
            <CollectionShelf
              collections={liveCollections}
              onPressCollection={(id) => onNavigateToCollectionDetail(id)}
              onToggleSave={toggleSaveCollection}
            />
          ) : null}
          {mediaHub && (mediaHub.videos.length > 0 || mediaHub.podcasts.length > 0) ? (
            <MediaHubShelf videos={mediaHub.videos} podcasts={mediaHub.podcasts} onPressItem={handleMediaHubItemPress} />
          ) : null}
          {eventCalendar &&
          (eventCalendar.active.length > 0 || eventCalendar.endingSoon.length > 0 || eventCalendar.upcoming.length > 0) ? (
            <EventCalendarSection calendar={eventCalendar} onPressEvent={handleEventPress} />
          ) : null}

          <View style={styles.navCards}>
            <NavCard
              title={t("discover.parksTitle")}
              subtitle={t("discover.parksSubtitle")}
              icon="castle"
              onPress={() => onNavigateToParks()}
            />
            <NavCard
              title="Park Radio"
              subtitle="Open independent Disney parks radio stations."
              icon="radio"
              onPress={onNavigateToParkRadio}
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  prompt: {
    fontSize: 15,
    marginTop: 4,
  },
  destinationRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },
  destinationCard: {
    width: 128,
    alignItems: "center",
    gap: 8,
  },
  destinationTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  scroll: {
    paddingBottom: 24,
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  navCards: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 64,
  },
  navCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navCardText: {
    flex: 1,
    gap: 2,
  },
  navCardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
});
