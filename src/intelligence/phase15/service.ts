// Phase 15 — Analytics service
// Depends on:
//   Phase 1 (FeedItem, Source) — volume, error state, content type per source
//   Phase 3 (StoryCluster) — cluster merge rate, duplicate metrics, coverage by park
//   Phase 4 (ClassificationResult) — official/breaking counts for feed quality report
// No invasive user tracking — all metrics derived from locally cached data.

import type { FeedItem, Source } from "../../domain/models";
import type { StoryCluster } from "../../types/storyTypes";
import {
  SILENT_SOURCE_HOURS,
  SLOW_SOURCE_THRESHOLD,
  WINDOW_24H_MS,
  WINDOW_7D_MS,
  COVERAGE_LOCATIONS,
  TOP_SOURCES_LIMIT,
} from "./rules";
import type {
  ContentAnalytics,
  CoverageGapEntry,
  DuplicateMetrics,
  FeedQualityReport,
  SourceHealthStat,
  SourceHealthStatus,
} from "./types";

export interface AnalyticsInput {
  feedItems: FeedItem[];
  sources: Source[];
  clusters: StoryCluster[];
  now?: Date;
}

// ── Source health ─────────────────────────────────────────────────────────────

function resolveSourceStatus(
  itemsLast24h: number,
  lastRefreshSucceeded: boolean | null | undefined,
  lastItemAt: string | undefined,
  now: number,
): SourceHealthStatus {
  if (lastRefreshSucceeded === false) return "failing";
  if (!lastItemAt) return "silent";
  const ageSinceLastItem = now - new Date(lastItemAt).getTime();
  if (ageSinceLastItem > SILENT_SOURCE_HOURS * 60 * 60 * 1000) return "silent";
  if (itemsLast24h <= SLOW_SOURCE_THRESHOLD) return "slow";
  return "healthy";
}

function buildSourceHealth(
  feedItems: FeedItem[],
  sources: Source[],
  now: number,
): SourceHealthStat[] {
  // Count items per source within windows
  const counts = new Map<string, { total: number; h24: number; d7: number; lastAt?: string }>();
  for (const item of feedItems) {
    const age = now - new Date(item.publishedAt).getTime();
    const existing = counts.get(item.sourceID) ?? { total: 0, h24: 0, d7: 0 };
    const lastAt =
      !existing.lastAt || new Date(item.publishedAt) > new Date(existing.lastAt)
        ? item.publishedAt
        : existing.lastAt;
    counts.set(item.sourceID, {
      total: existing.total + 1,
      h24: age <= WINDOW_24H_MS ? existing.h24 + 1 : existing.h24,
      d7: age <= WINDOW_7D_MS ? existing.d7 + 1 : existing.d7,
      lastAt,
    });
  }

  return sources
    .filter((s) => s.isEnabled)
    .map((source) => {
      const c = counts.get(source.id) ?? { total: 0, h24: 0, d7: 0 };
      const status = resolveSourceStatus(
        c.h24,
        source.lastRefreshSucceeded,
        c.lastAt,
        now,
      );
      const primaryType =
        source.categoryTags.find((t) =>
          ["video", "podcast", "official", "community"].includes(t),
        ) ?? "article";
      return {
        sourceId: source.id,
        sourceName: source.name,
        totalItems: c.total,
        itemsLast24h: c.h24,
        itemsLast7d: c.d7,
        lastItemAt: c.lastAt,
        lastRefreshSucceeded: source.lastRefreshSucceeded ?? undefined,
        lastErrorMessage: source.lastErrorMessage ?? undefined,
        status,
        contentType: primaryType,
      };
    });
}

// ── Coverage gaps ─────────────────────────────────────────────────────────────

function buildCoverageGaps(clusters: StoryCluster[], now: number): CoverageGapEntry[] {
  const parkItemCounts = new Map<string, number>();
  const parkClusterCounts = new Map<string, number>();

  for (const cluster of clusters) {
    const age = now - new Date(cluster.lastPublishedAt).getTime();
    if (age > WINDOW_24H_MS) continue;
    for (const parkId of cluster.parks) {
      parkClusterCounts.set(parkId, (parkClusterCounts.get(parkId) ?? 0) + 1);
      parkItemCounts.set(parkId, (parkItemCounts.get(parkId) ?? 0) + cluster.items.length);
    }
  }

  return COVERAGE_LOCATIONS.map(({ id, label }) => {
    const itemsLast24h = parkItemCounts.get(id) ?? 0;
    const clustersLast24h = parkClusterCounts.get(id) ?? 0;
    return {
      locationId: id,
      locationLabel: label,
      itemsLast24h,
      clustersLast24h,
      hasCoverage: clustersLast24h > 0,
    };
  });
}

// ── Duplicate / cluster metrics ───────────────────────────────────────────────

function buildDuplicateMetrics(feedItems: FeedItem[], clusters: StoryCluster[]): DuplicateMetrics {
  const totalItems = feedItems.length;
  const clusterCount = clusters.length;
  const multiItemClusters = clusters.filter((c) => c.items.length > 1);
  const itemsInMultiClusters = multiItemClusters.reduce((sum, c) => sum + c.items.length, 0);
  const mergeRate = totalItems > 0 ? itemsInMultiClusters / totalItems : 0;
  const avgItemsPerCluster = clusterCount > 0 ? totalItems / clusterCount : 0;
  const singletonClusters = clusters.filter((c) => c.items.length === 1).length;

  const socialPostCount = feedItems.filter(
    (item) => item.contentType === "community",
  ).length;

  // Estimate deduplicated social reposts: community items hidden inside clusters as duplicates
  const socialDedupeCount = clusters.reduce((sum, c) => {
    return (
      sum +
      c.items.filter(
        (i) =>
          i.clusterRole === "duplicate_social_reference" ||
          i.isHiddenDuplicate,
      ).length
    );
  }, 0);

  return {
    totalItems,
    clusterCount,
    avgItemsPerCluster: Math.round(avgItemsPerCluster * 10) / 10,
    singletonClusters,
    mergeRate: Math.round(mergeRate * 1000) / 1000,
    socialPostCount,
    socialDedupeCount,
  };
}

// ── Feed quality ──────────────────────────────────────────────────────────────

function buildFeedQualityReport(
  feedItems: FeedItem[],
  sources: Source[],
  clusters: StoryCluster[],
  sourceHealth: SourceHealthStat[],
  nowMs: number,
): FeedQualityReport {
  const activeSources = sourceHealth.filter((s) => s.status === "healthy").length;
  const failingSources = sourceHealth.filter((s) => s.status === "failing").length;
  const silentSources = sourceHealth.filter((s) => s.status === "silent").length;

  // Count official/breaking from clusters (Phase 4 classification)
  const officialItems = clusters.filter(
    (c) => c.officialSourcePresent || c.classification?.isOfficialAnnouncement,
  ).length;
  const breakingItems = clusters.filter((c) => c.breakingScore >= 70).length;

  const videoItems = feedItems.filter((i) => i.contentType === "video").length;
  const podcastItems = feedItems.filter((i) => i.contentType === "podcast").length;

  return {
    totalSources: sources.filter((s) => s.isEnabled).length,
    activeSources,
    failingSources,
    silentSources,
    totalItems: feedItems.length,
    officialItems,
    breakingItems,
    videoItems,
    podcastItems,
    computedAt: nowMs,
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function buildContentAnalytics(input: AnalyticsInput): ContentAnalytics {
  const { feedItems, sources, clusters, now = new Date() } = input;
  const nowMs = now.getTime();

  const sourceHealth = buildSourceHealth(feedItems, sources, nowMs);
  const coverageGaps = buildCoverageGaps(clusters, nowMs);
  const duplicateMetrics = buildDuplicateMetrics(feedItems, clusters);
  const feedQuality = buildFeedQualityReport(
    feedItems,
    sources,
    clusters,
    sourceHealth,
    nowMs,
  );

  const topSourcesByVolume = [...sourceHealth]
    .sort((a, b) => b.totalItems - a.totalItems)
    .slice(0, TOP_SOURCES_LIMIT);

  return {
    sourceHealth,
    coverageGaps,
    duplicateMetrics,
    feedQuality,
    topSourcesByVolume,
    computedAt: nowMs,
  };
}
