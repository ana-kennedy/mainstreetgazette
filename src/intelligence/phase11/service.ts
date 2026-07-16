// Phase 11 — Trending Engine service
// Depends on:
//   Phase 3 (StoryCluster, ClusteredItem) — velocity, source counts, community counts
//   Phase 4 (ClassificationResult) — importanceScore, isOfficialAnnouncement
//   Phase 7 (UserPersonalizationPreferences) — favoriteEntities, parks, topics for user-interest boost
//   Phase 1 (FeedItem, Source) — per-source velocity tracking

import type { FeedItem, Source } from "../../domain/models";
import type { StoryCluster } from "../../types/storyTypes";
import type { UserPersonalizationPreferences } from "../../personalization/personalizationTypes";
import {
  TRENDING_WEIGHTS,
  MAX_VELOCITY_BONUS,
  MAX_SOURCE_BONUS,
  MAX_COMMUNITY_BONUS,
  VELOCITY_WINDOW_24H_MS,
  VELOCITY_WINDOW_6H_MS,
  TRENDING_STORY_LIMIT,
  FASTEST_GROWING_LIMIT,
  TRENDING_TOPIC_LIMIT,
  TRENDING_MEDIA_LIMIT,
  SOURCE_VELOCITY_LIMIT,
  MIN_TRENDING_SCORE,
} from "./rules";
import type {
  SourceVelocityEntry,
  TrendingEntry,
  TrendingFeed,
  TrendingMediaEntry,
  TrendingTopic,
} from "./types";

export interface TrendingInput {
  clusters: StoryCluster[];
  prefs?: UserPersonalizationPreferences;
  feedItems?: FeedItem[];
  sources?: Source[];
  now?: Date;
}

// ── Velocity ─────────────────────────────────────────────────────────────────

function clusterVelocity(cluster: StoryCluster, windowMs: number, now: number): number {
  return cluster.items.filter(
    (item) => now - new Date(item.publishedAt).getTime() <= windowMs,
  ).length;
}

// ── Score a single cluster for trending ──────────────────────────────────────

export function scoreTrendingCluster(
  cluster: StoryCluster,
  prefs?: UserPersonalizationPreferences,
  now: number = Date.now(),
): number {
  const velocity = clusterVelocity(cluster, VELOCITY_WINDOW_24H_MS, now);
  const velocityBonus = Math.min(velocity * TRENDING_WEIGHTS.recentStoryVelocity, MAX_VELOCITY_BONUS);

  const sourceBonus = Math.min(
    cluster.sourceCount * TRENDING_WEIGHTS.trustedSourceCount,
    MAX_SOURCE_BONUS,
  );

  const communityBonus = Math.min(
    cluster.communityCount * TRENDING_WEIGHTS.communityDiscussionVolume,
    MAX_COMMUNITY_BONUS,
  );

  const officialBonus = cluster.officialSourcePresent ? TRENDING_WEIGHTS.officialSourceBoost : 0;

  let favoriteBonus = 0;
  if (prefs) {
    const matchesFav =
      cluster.entities.some((e) => prefs.favoriteEntities.includes(e)) ||
      cluster.parks.some((p) => prefs.favoriteParks.includes(p)) ||
      cluster.topics.some((t) => prefs.favoriteTopics.includes(t));
    if (matchesFav) favoriteBonus = TRENDING_WEIGHTS.favoriteUserMatch;
  }

  // Importance from Phase 4 classification adds fractional boost
  const importanceBonus = Math.round((cluster.classification?.importanceScore ?? 50) * 0.2);

  return velocityBonus + sourceBonus + communityBonus + officialBonus + favoriteBonus + importanceBonus;
}

// ── Build a TrendingEntry ─────────────────────────────────────────────────────

function toTrendingEntry(
  cluster: StoryCluster,
  score: number,
  rank: number,
  now: number,
): TrendingEntry {
  const velocity = clusterVelocity(cluster, VELOCITY_WINDOW_24H_MS, now);
  const isBreaking = cluster.breakingScore >= 70;
  const isOfficial =
    (cluster.classification?.isOfficialAnnouncement ?? false) || cluster.officialSourcePresent;

  const metaParts: string[] = [];
  if (isBreaking) metaParts.push("Breaking");
  if (isOfficial) metaParts.push("Official");
  if (cluster.sourceCount > 1) metaParts.push(`${cluster.sourceCount} sources`);
  if (cluster.communityCount > 0) metaParts.push(`${cluster.communityCount} community`);

  const a11yLabel = [
    `Trending #${rank}.`,
    cluster.canonicalTitle,
    ...metaParts,
  ].join(" ");

  return {
    clusterId: cluster.clusterId,
    primaryItemId: cluster.primaryItemId,
    headline: cluster.canonicalTitle,
    summary: cluster.shortSummary || undefined,
    trendingScore: score,
    rank,
    velocity,
    sourceCount: cluster.sourceCount,
    communityCount: cluster.communityCount,
    isBreaking,
    isOfficial,
    parkIds: cluster.parks,
    topicIds: cluster.topics,
    publishedAt: cluster.lastPublishedAt,
    accessibilityLabel: a11yLabel,
  };
}

// ── Trending topics ───────────────────────────────────────────────────────────

function buildTrendingTopics(clusters: StoryCluster[], now: number): TrendingTopic[] {
  const topicMap = new Map<
    string,
    { clusterCount: number; totalSourceCount: number; velocity: number }
  >();

  for (const cluster of clusters) {
    const v = clusterVelocity(cluster, VELOCITY_WINDOW_24H_MS, now);
    for (const topicId of cluster.topics) {
      const existing = topicMap.get(topicId) ?? { clusterCount: 0, totalSourceCount: 0, velocity: 0 };
      topicMap.set(topicId, {
        clusterCount: existing.clusterCount + 1,
        totalSourceCount: existing.totalSourceCount + cluster.sourceCount,
        velocity: existing.velocity + v,
      });
    }
  }

  return Array.from(topicMap.entries())
    .map(([topicId, data]) => ({
      topicId,
      label: topicId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      ...data,
      trendingScore:
        data.clusterCount * 20 +
        data.velocity * TRENDING_WEIGHTS.recentStoryVelocity +
        data.totalSourceCount * 5,
    }))
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, TRENDING_TOPIC_LIMIT);
}

// ── Source velocity ───────────────────────────────────────────────────────────

function buildSourceVelocity(
  feedItems: FeedItem[],
  sources: Source[],
  now: number,
): SourceVelocityEntry[] {
  const sourceNameMap = new Map(sources.map((s) => [s.id, s.name]));
  const counts = new Map<string, { h24: number; h6: number }>();

  for (const item of feedItems) {
    const age = now - new Date(item.publishedAt).getTime();
    if (age > VELOCITY_WINDOW_24H_MS) continue;
    const c = counts.get(item.sourceID) ?? { h24: 0, h6: 0 };
    counts.set(item.sourceID, {
      h24: c.h24 + 1,
      h6: age <= VELOCITY_WINDOW_6H_MS ? c.h6 + 1 : c.h6,
    });
  }

  return Array.from(counts.entries())
    .map(([sourceId, { h24, h6 }]) => ({
      sourceId,
      sourceName: sourceNameMap.get(sourceId) ?? sourceId,
      itemsLast24h: h24,
      itemsLast6h: h6,
      trendingScore: h6 * 20 + h24 * 5,
    }))
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, SOURCE_VELOCITY_LIMIT);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function buildTrendingFeed(input: TrendingInput): TrendingFeed {
  const { clusters, prefs, feedItems = [], sources = [], now = new Date() } = input;
  const nowMs = now.getTime();

  // Score every cluster
  const scored = clusters.map((c) => ({
    cluster: c,
    score: scoreTrendingCluster(c, prefs, nowMs),
  }));

  // Trending stories — sorted by score, above minimum threshold
  const eligible = scored
    .filter(({ score }) => score >= MIN_TRENDING_SCORE)
    .sort((a, b) => b.score - a.score);

  const trendingStories: TrendingEntry[] = eligible
    .slice(0, TRENDING_STORY_LIMIT)
    .map(({ cluster, score }, i) => toTrendingEntry(cluster, score, i + 1, nowMs));

  // Fastest growing — sorted by 24h velocity (most new items)
  const fastestGrowing: TrendingEntry[] = [...scored]
    .sort(
      (a, b) =>
        clusterVelocity(b.cluster, VELOCITY_WINDOW_24H_MS, nowMs) -
        clusterVelocity(a.cluster, VELOCITY_WINDOW_24H_MS, nowMs),
    )
    .slice(0, FASTEST_GROWING_LIMIT)
    .map(({ cluster, score }, i) => toTrendingEntry(cluster, score, i + 1, nowMs));

  // Most discussed topics — weighted by cluster coverage and velocity
  const mostDiscussedTopics = buildTrendingTopics(clusters, nowMs);

  // Trending by park — top cluster per park
  const trendingByPark: Record<string, TrendingEntry> = {};
  for (const { cluster, score } of eligible) {
    for (const parkId of cluster.parks) {
      if (!trendingByPark[parkId]) {
        trendingByPark[parkId] = toTrendingEntry(cluster, score, 1, nowMs);
      }
    }
  }

  // Trending videos
  const trendingVideos: TrendingMediaEntry[] = eligible
    .filter(({ cluster }) => cluster.videoCount > 0)
    .slice(0, TRENDING_MEDIA_LIMIT)
    .map(({ cluster, score }) => ({
      mediaType: "video",
      clusterId: cluster.clusterId,
      primaryItemId: cluster.primaryItemId,
      headline: cluster.canonicalTitle,
      sourceName: cluster.items.find((i) => i.contentType === "video")?.sourceName,
      trendingScore: score,
    }));

  // Trending podcasts
  const trendingPodcasts: TrendingMediaEntry[] = eligible
    .filter(({ cluster }) => cluster.podcastCount > 0)
    .slice(0, TRENDING_MEDIA_LIMIT)
    .map(({ cluster, score }) => ({
      mediaType: "podcast",
      clusterId: cluster.clusterId,
      primaryItemId: cluster.primaryItemId,
      headline: cluster.canonicalTitle,
      sourceName: cluster.items.find((i) => i.contentType === "podcast")?.sourceName,
      trendingScore: score,
    }));

  // Source velocity
  const sourceVelocity = buildSourceVelocity(feedItems, sources, nowMs);

  return {
    trendingStories,
    fastestGrowing,
    mostDiscussedTopics,
    trendingByPark,
    trendingVideos,
    trendingPodcasts,
    sourceVelocity,
    computedAt: nowMs,
  };
}
