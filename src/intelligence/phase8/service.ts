// Phase 8 — Discovery Engine service
// Depends on: Phase 3 (StoryCluster), Phase 5 (timeline freshness), Phase 7 (UserPersonalizationPreferences)

import type { StoryCluster } from "../../types/storyTypes";
import type { UserPersonalizationPreferences } from "../../personalization/personalizationTypes";
import {
  DISCOVERY_SCORES,
  DISCOVERY_SECTION_LIMITS,
  PARK_DISPLAY_NAMES,
} from "./rules";
import type {
  DiscoveryFeed,
  DiscoveryItem,
  DiscoveryMediaLabel,
  DiscoveryReasonId,
} from "./types";

export interface DiscoveryInput {
  clusters: StoryCluster[];
  prefs: UserPersonalizationPreferences;
  readItemIDs: Set<string>;
  entityNameMap: Map<string, string>;
  topicNameMap: Map<string, string>;
  sourceNameMap: Map<string, string>;
}

function freshnessBoost(publishedAt: string): number {
  const ageH = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  if (ageH <= 24) return DISCOVERY_SCORES.freshnessBoost24h;
  if (ageH <= 72) return DISCOVERY_SCORES.freshnessBoost72h;
  return 0;
}

function primaryMediaLabel(cluster: StoryCluster): DiscoveryMediaLabel {
  if (cluster.officialSourcePresent) return "official";
  if (cluster.videoCount > 0 && cluster.videoCount >= cluster.articleCount) return "video";
  if (cluster.podcastCount > 0 && cluster.podcastCount >= cluster.articleCount) return "podcast";
  if (cluster.communityCount > 0 && cluster.articleCount === 0) return "community";
  return "article";
}

function buildItem(
  cluster: StoryCluster,
  reason: DiscoveryReasonId,
  reasonLabel: string,
  baseScore: number,
): DiscoveryItem {
  const importance = cluster.classification?.importanceScore ?? 50;
  const score =
    baseScore +
    (cluster.officialSourcePresent ? DISCOVERY_SCORES.officialBoost : 0) +
    (cluster.breakingScore >= 70 ? DISCOVERY_SCORES.breakingBoost : 0) +
    freshnessBoost(cluster.lastPublishedAt) +
    Math.round((importance - 50) * DISCOVERY_SCORES.importanceBoostPerPoint);

  const mediaLabel = primaryMediaLabel(cluster);
  const sourceName = cluster.items[0]?.sourceName;
  const isBreaking = cluster.breakingScore >= 70;
  const parts = [
    cluster.canonicalTitle,
    sourceName,
    reasonLabel,
    cluster.officialSourcePresent ? "Official" : null,
    isBreaking ? "Breaking" : null,
  ].filter(Boolean);

  return {
    id: cluster.clusterId,
    itemType: "cluster",
    headline: cluster.canonicalTitle,
    summary: cluster.shortSummary || undefined,
    mediaLabel,
    sourceName,
    publishedAt: cluster.lastPublishedAt,
    score,
    reason,
    reasonLabel,
    primaryItemId: cluster.primaryItemId,
    clusterId: cluster.clusterId,
    hasOfficialSource: cluster.officialSourcePresent,
    isBreaking,
    accessibilityLabel: parts.join(". "),
    accessibilityHint: "Double tap to read more.",
  };
}

function resolveParkName(parkId: string, entityNameMap: Map<string, string>): string {
  return entityNameMap.get(parkId) ?? PARK_DISPLAY_NAMES[parkId] ?? "a park you love";
}

export function buildDiscoveryFeed(input: DiscoveryInput): DiscoveryFeed {
  const { clusters, prefs, readItemIDs, entityNameMap, topicNameMap, sourceNameMap } = input;

  const hasFollows =
    prefs.favoriteEntities.length > 0 ||
    prefs.favoriteParks.length > 0 ||
    prefs.favoriteTopics.length > 0 ||
    prefs.preferredSources.length > 0;

  // Exclude clusters where every item has been read
  const unreadClusters = clusters.filter(
    (c) => !c.items.every((item) => readItemIDs.has(item.itemId)),
  );

  // Exclude muted content
  const activeClusters = unreadClusters.filter((c) => {
    if (c.entities.some((e) => prefs.mutedEntities.includes(e))) return false;
    if (c.parks.some((p) => prefs.mutedParks.includes(p))) return false;
    if (c.topics.some((t) => prefs.mutedTopics.includes(t))) return false;
    if (prefs.mutedSources.includes(c.primarySourceId)) return false;
    return true;
  });

  // ── Section 1: Because You Follow ─────────────────────────────────────────
  // Matches favoriteEntities, favoriteParks, favoriteTopics in priority order
  const byFollowSeen = new Set<string>();
  const byFollowItems: DiscoveryItem[] = [];

  for (const cluster of activeClusters) {
    if (byFollowSeen.has(cluster.clusterId)) continue;

    // Entity match (highest affinity)
    for (const entityId of cluster.entities) {
      if (prefs.favoriteEntities.includes(entityId)) {
        const name = entityNameMap.get(entityId) ?? "a place you love";
        byFollowItems.push(
          buildItem(cluster, "because_you_follow_entity", `Because you follow ${name}`, DISCOVERY_SCORES.favoriteEntity),
        );
        byFollowSeen.add(cluster.clusterId);
        break;
      }
    }
    if (byFollowSeen.has(cluster.clusterId)) continue;

    // Park match
    for (const parkId of cluster.parks) {
      if (prefs.favoriteParks.includes(parkId)) {
        const name = resolveParkName(parkId, entityNameMap);
        byFollowItems.push(
          buildItem(cluster, "because_you_follow_park", `Because you follow ${name}`, DISCOVERY_SCORES.favoritePark),
        );
        byFollowSeen.add(cluster.clusterId);
        break;
      }
    }
    if (byFollowSeen.has(cluster.clusterId)) continue;

    // Topic match
    for (const topicId of cluster.topics) {
      if (prefs.favoriteTopics.includes(topicId)) {
        const name = topicNameMap.get(topicId) ?? "a topic you follow";
        byFollowItems.push(
          buildItem(cluster, "because_you_follow_topic", `Because you follow ${name}`, DISCOVERY_SCORES.favoriteTopic),
        );
        byFollowSeen.add(cluster.clusterId);
        break;
      }
    }
  }

  const becauseYouFollow = byFollowItems
    .sort((a, b) => b.score - a.score)
    .slice(0, DISCOVERY_SECTION_LIMITS.becauseYouFollow);

  // ── Section 2: New From Favorite Sources ──────────────────────────────────
  const sourceItems: DiscoveryItem[] = [];
  if (prefs.preferredSources.length > 0) {
    for (const cluster of activeClusters) {
      if (prefs.preferredSources.includes(cluster.primarySourceId)) {
        const name = sourceNameMap.get(cluster.primarySourceId) ?? "a source you follow";
        sourceItems.push(
          buildItem(cluster, "new_from_favorite_source", `New from ${name}`, DISCOVERY_SCORES.favoriteSource),
        );
      }
    }
  }
  const newFromSources = sourceItems
    .sort((a, b) => b.score - a.score)
    .slice(0, DISCOVERY_SECTION_LIMITS.newFromFavoriteSources);

  // ── Section 3: Trending Near Your Interests ───────────────────────────────
  const trendingItems: DiscoveryItem[] = [];
  if (hasFollows) {
    for (const cluster of activeClusters) {
      const importance = cluster.classification?.importanceScore ?? 0;
      if (importance < 60) continue;
      const nearInterest =
        cluster.entities.some((e) => prefs.favoriteEntities.includes(e)) ||
        cluster.parks.some((p) => prefs.favoriteParks.includes(p)) ||
        cluster.topics.some((t) => prefs.favoriteTopics.includes(t));
      if (nearInterest) {
        trendingItems.push(
          buildItem(cluster, "trending_near_interests", "Trending near your interests", 15 + Math.round(importance - 60)),
        );
      }
    }
  }
  const trendingNear = trendingItems
    .sort((a, b) => b.score - a.score)
    .slice(0, DISCOVERY_SECTION_LIMITS.trendingNearInterests);

  // ── Section 4: Recommended Videos ────────────────────────────────────────
  // YouTube/video content — not a duplicate of articles, per Phase 8 spec
  const videoItems: DiscoveryItem[] = activeClusters
    .filter((c) => c.videoCount > 0)
    .map((c) => buildItem(c, "recommended_video", "Recommended video", 20))
    .sort((a, b) => b.score - a.score)
    .slice(0, DISCOVERY_SECTION_LIMITS.recommendedVideos);

  // ── Section 5: Recommended Podcasts ──────────────────────────────────────
  // Podcast episodes — related media, not duplicates, per Phase 8 spec
  const podcastItems: DiscoveryItem[] = activeClusters
    .filter((c) => c.podcastCount > 0)
    .map((c) => buildItem(c, "recommended_podcast", "Recommended podcast", 20))
    .sort((a, b) => b.score - a.score)
    .slice(0, DISCOVERY_SECTION_LIMITS.recommendedPodcasts);

  // ── Assemble non-empty sections by priority ───────────────────────────────
  const allSections = [
    becauseYouFollow.length > 0
      ? { id: "because_you_follow", label: "Because You Follow", priority: 100, items: becauseYouFollow }
      : null,
    newFromSources.length > 0
      ? { id: "new_from_favorite_sources", label: "New From Favorite Sources", priority: 80, items: newFromSources }
      : null,
    trendingNear.length > 0
      ? { id: "trending_near_interests", label: "Trending Near Your Interests", priority: 70, items: trendingNear }
      : null,
    videoItems.length > 0
      ? { id: "recommended_videos", label: "Recommended Videos", priority: 50, items: videoItems }
      : null,
    podcastItems.length > 0
      ? { id: "recommended_podcasts", label: "Recommended Podcasts", priority: 40, items: podcastItems }
      : null,
  ].filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    sections: allSections,
    computedAt: Date.now(),
    hasFollows,
  };
}
