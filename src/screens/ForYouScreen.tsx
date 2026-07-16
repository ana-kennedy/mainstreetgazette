// Phase 05 (Gazette experience redesign) — For You root: three headings (Continue Your
// Adventure / The Gazette Library / Today's Picks), each hidden when empty, replacing the old
// saved/queue/following/downloads tab switcher. See PHASE_05_RESULTS.md for what moved where
// and what was intentionally left out (full collection management, Ready Offline, Trip
// Companion — none of those have any backing data/feature to build on yet).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { AdaptiveSection } from "../components/AdaptiveSection";
import { GazetteCard } from "../components/GazetteCard";
import { SettingsGearButton } from "../components/GazettePageHeader";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { usePlayback } from "../context/PlaybackContext";
import { useTripCompanion } from "../context/TripCompanionContext";
import type { FeedItem, PlaybackProgress } from "../domain/models";
import type { StoryCluster } from "../types/storyTypes";
import { clusterToStoryClusterLike } from "../personalization/clusterAdapter";
import { rankPersonalizedStories } from "../personalization/personalizationEngine";
import { loadPlaybackProgress } from "../services/storage";

function getTimeGreeting(t: TFunction, name?: string): string {
  const hour = new Date().getHours();
  let key: string;
  if (hour >= 5 && hour < 12) key = "morning";
  else if (hour >= 12 && hour < 17) key = "afternoon";
  else if (hour >= 17 && hour < 21) key = "evening";
  else key = "night";
  return name ? t(`greeting.${key}_name`, { name }) : t(`greeting.${key}`);
}

export interface ForYouScreenCoreProps {
  onNavigateToDetail: (item: FeedItem) => void;
  onNavigateToStoryDetail: (clusterId: string) => void;
  onNavigateToPlayer: () => void;
  onOpenLibrary: () => void;
  onOpenTripCompanion: () => void;
  onOpenPreferences: () => void;
}

export function ForYouScreenCore({
  onNavigateToDetail,
  onNavigateToStoryDetail,
  onNavigateToPlayer,
  onOpenLibrary,
  onOpenTripCompanion,
  onOpenPreferences,
}: ForYouScreenCoreProps) {
  const app = useAppContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const playback = usePlayback();
  const { prefs: personalizationPrefs } = usePersonalization();
  const { trips } = useTripCompanion();

  // Phase 08 — Trip Companion entry point. Always shown (not gated by AdaptiveSection)
  // since it's the discoverability path into the feature, not content that can be
  // "weak" — the destination screen itself handles the zero-trips empty state.
  const nextTrip = useMemo(() => {
    if (trips.length === 0) return null;
    return [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  }, [trips]);
  const nextTripDestinationLabel = nextTrip
    ? t(`myMagic.destination.${nextTrip.destinationId}`, nextTrip.destinationId)
    : "";

  const itemByID = useMemo(() => new Map(app.items.map((i) => [i.id, i])), [app.items]);

  // Continue Your Adventure — only genuinely resumable content. Podcasts have real saved
  // playback position (PlaybackContext); articles don't — nothing in this app tracks reading
  // progress today, so this section deliberately doesn't show "recently opened" articles as if
  // they were resumable. See PHASE_05_RESULTS.md for the readingHistory.ts gap.
  const [inProgressPodcasts, setInProgressPodcasts] = useState<PlaybackProgress[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadPlaybackProgress()
      .then((all) => {
        if (cancelled) return;
        setInProgressPodcasts(
          all
            .filter((p) => !p.isCompleted && p.positionSeconds > 5)
            .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime())
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [app.items]);

  const continueItems = useMemo(
    () =>
      inProgressPodcasts
        .map((p) => itemByID.get(p.feedItemID))
        .filter((item): item is FeedItem => item != null)
        .slice(0, 6),
    [inProgressPodcasts, itemByID]
  );

  const handleResume = useCallback(
    (item: FeedItem) => {
      playback.playItem(item);
      onNavigateToPlayer();
    },
    [playback, onNavigateToPlayer]
  );

  // The Gazette Library preview — a handful of recent saves, not the whole list (that's what
  // "Open the Gazette Library" is for). No "saved at" timestamp exists on FeedItem, so this
  // sorts by publish date among saved items as the closest available notion of "recent."
  const recentSaved = useMemo(
    () =>
      [...app.savedItems]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 6),
    [app.savedItems]
  );

  // Today's Picks — reuses the same personalization ranking News' My Magic view already uses,
  // rather than a separate recommendation system. Hidden entirely when the guest has no
  // favorites configured, or ranking finds nothing — "hide when recommendations are weak."
  const hasFavorites =
    personalizationPrefs.favoriteLocations.length > 0 ||
    personalizationPrefs.favoriteParks.length > 0 ||
    personalizationPrefs.favoriteTopics.length > 0 ||
    personalizationPrefs.favoriteEntities.length > 0;

  const todaysPicks = useMemo<StoryCluster[]>(() => {
    if (!hasFavorites || app.clusters.length === 0) return [];
    const likes = app.clusters.map(clusterToStoryClusterLike);
    const ranked = rankPersonalizedStories(likes, personalizationPrefs);
    const clusterByID = new Map(app.clusters.map((c) => [c.clusterId, c]));
    return ranked
      .map((r) => clusterByID.get(r.id))
      .filter((c): c is StoryCluster => c != null)
      .slice(0, 6);
  }, [hasFavorites, app.clusters, personalizationPrefs]);

  // Phase 06: a "recommendations" section backed by a single source, however many
  // clusters, isn't meaningful variety — gate on distinct sources, not raw count.
  const todaysPicksSourceIDs = useMemo(
    () => todaysPicks.flatMap((cluster) => cluster.items.map((item) => item.sourceId)),
    [todaysPicks]
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.onSurface }]}
              accessibilityRole="header"
            >
              {t("forYou.title")}
            </Text>
            <SettingsGearButton onPress={onOpenPreferences} />
          </View>
          <Text
            style={[styles.greeting, { color: theme.colors.onSurfaceVariant }]}
            accessibilityRole="header"
            accessibilityLabel={getTimeGreeting(t, app.settings?.displayName)}
          >
            {getTimeGreeting(t, app.settings?.displayName)}
          </Text>
        </View>

        <AdaptiveSection itemCount={continueItems.length}>
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
              accessibilityRole="header"
            >
              {t("forYou.continueAdventure")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {continueItems.map((item) => (
                <GazetteCard
                  key={item.id}
                  onPress={() => handleResume(item)}
                  accessibilityLabel={item.title}
                  accessibilityHint={t("forYou.resumePodcastHint")}
                  style={styles.previewCard}
                >
                  <Text numberOfLines={3} style={[styles.previewTitle, { color: theme.colors.onSurface }]}>
                    {item.title}
                  </Text>
                </GazetteCard>
              ))}
            </ScrollView>
          </View>
        </AdaptiveSection>

        <AdaptiveSection itemCount={recentSaved.length}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text
                variant="titleSmall"
                style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
                accessibilityRole="header"
              >
                {t("forYou.gazetteLibrary")}
              </Text>
              <Button
                mode="text"
                compact
                onPress={onOpenLibrary}
                accessibilityRole="button"
                accessibilityHint={t("forYou.openLibraryHint")}
              >
                {t("forYou.openLibrary")}
              </Button>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {recentSaved.map((item) => (
                <GazetteCard
                  key={item.id}
                  onPress={() => onNavigateToDetail(item)}
                  accessibilityLabel={item.title}
                  accessibilityHint="Double tap to open."
                  style={styles.previewCard}
                >
                  <Text numberOfLines={3} style={[styles.previewTitle, { color: theme.colors.onSurface }]}>
                    {item.title}
                  </Text>
                </GazetteCard>
              ))}
            </ScrollView>
          </View>
        </AdaptiveSection>

        <AdaptiveSection
          itemCount={todaysPicks.length}
          sourceIDs={todaysPicksSourceIDs}
          minUniqueSources={2}
        >
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
              accessibilityRole="header"
            >
              {t("forYou.todaysPicks")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {todaysPicks.map((cluster) => (
                <GazetteCard
                  key={cluster.clusterId}
                  onPress={() => onNavigateToStoryDetail(cluster.clusterId)}
                  accessibilityLabel={cluster.canonicalTitle}
                  accessibilityHint="Double tap to read."
                  style={styles.previewCard}
                >
                  <Text numberOfLines={3} style={[styles.previewTitle, { color: theme.colors.onSurface }]}>
                    {cluster.canonicalTitle}
                  </Text>
                </GazetteCard>
              ))}
            </ScrollView>
          </View>
        </AdaptiveSection>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text
              variant="titleSmall"
              style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
              accessibilityRole="header"
            >
              Trip Companion
            </Text>
            <Button
              mode="text"
              compact
              onPress={onOpenTripCompanion}
              accessibilityRole="button"
              accessibilityHint="Double tap to manage your Disney trips."
            >
              {nextTrip ? "Manage Trips" : "Plan a Trip"}
            </Button>
          </View>
          {nextTrip ? (
            <GazetteCard
              onPress={onOpenTripCompanion}
              accessibilityLabel={`Upcoming trip: ${nextTripDestinationLabel}, ${nextTrip.startDate} to ${nextTrip.endDate}`}
              accessibilityHint="Double tap to view trip details and reminders."
              style={styles.tripPreviewCard}
            >
              <Text style={[styles.previewTitle, { color: theme.colors.onSurface }]}>
                {nextTripDestinationLabel}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {nextTrip.startDate} – {nextTrip.endDate}
              </Text>
            </GazetteCard>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
  header: {
    padding: 12,
    gap: 4,
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
  greeting: {
    fontSize: 15,
    fontWeight: "500",
  },
  section: {
    marginTop: 12,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 12,
  },
  horizontalList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  previewCard: {
    width: 160,
  },
  previewTitle: {
    fontWeight: "600",
  },
  tripPreviewCard: {
    marginHorizontal: 12,
    gap: 2,
  },
});
