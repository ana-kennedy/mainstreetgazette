import type { StoryCluster } from "../../types/storyTypes";
import {
  BREAKING_WINDOW_MS,
  EXPLORE_STAT_ICONS,
  MIN_ENTITY_CLUSTER_COUNT,
  TRENDING_ENTITY_LIMIT,
} from "./rules";
import type {
  ExploreEntitySpotlight,
  ExploreHub,
  ExploreStatChip,
} from "./types";

export interface ExploreHubInput {
  clusters: StoryCluster[];
  activeEventIds?: string[];
  now?: Date;
}

export function buildExploreHub(input: ExploreHubInput): ExploreHub {
  const { clusters, activeEventIds = [], now = new Date() } = input;
  const nowMs = now.getTime();
  const cutoff = nowMs - BREAKING_WINDOW_MS;

  // Breaking count — clusters with a breaking score within 24 h
  const breakingClusterIds = clusters
    .filter(
      (c) =>
        c.breakingScore > 0 &&
        new Date(c.lastPublishedAt).getTime() >= cutoff,
    )
    .map((c) => c.clusterId);

  // Trending entities — aggregate cluster counts per entity name
  const entityCounts = new Map<string, { count: number; parkIds: Set<string> }>();
  for (const cluster of clusters) {
    for (const entityName of cluster.entities) {
      if (!entityName) continue;
      const entry = entityCounts.get(entityName) ?? { count: 0, parkIds: new Set() };
      entry.count += 1;
      for (const parkId of cluster.parks) {
        entry.parkIds.add(parkId);
      }
      entityCounts.set(entityName, entry);
    }
  }

  const trendingEntities: ExploreEntitySpotlight[] = [...entityCounts.entries()]
    .filter(([, v]) => v.count >= MIN_ENTITY_CLUSTER_COUNT)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, TRENDING_ENTITY_LIMIT)
    .map(([entityName, v]) => ({
      entityName,
      clusterCount: v.count,
      parkIds: [...v.parkIds],
      accessibilityLabel: `${entityName}: ${v.count} ${v.count === 1 ? "story" : "stories"}`,
    }));

  // Stat chips
  const stats: ExploreStatChip[] = [
    {
      id: "breaking",
      label: "Breaking",
      count: breakingClusterIds.length,
      icon: EXPLORE_STAT_ICONS.breaking,
      accessibilityLabel: `${breakingClusterIds.length} breaking ${breakingClusterIds.length === 1 ? "story" : "stories"} in the last 24 hours`,
    },
    {
      id: "active_events",
      label: "Events",
      count: activeEventIds.length,
      icon: EXPLORE_STAT_ICONS.active_events,
      accessibilityLabel: `${activeEventIds.length} active ${activeEventIds.length === 1 ? "event" : "events"}`,
    },
    {
      id: "trending_entities",
      label: "Topics",
      count: trendingEntities.length,
      icon: EXPLORE_STAT_ICONS.trending_entities,
      accessibilityLabel: `${trendingEntities.length} trending ${trendingEntities.length === 1 ? "topic" : "topics"}`,
    },
  ];

  const hasAccessibilityNews = clusters.some((c) => {
    const text = c.canonicalTitle.toLowerCase();
    return (
      text.includes("das") ||
      text.includes("accessibility") ||
      text.includes("disability") ||
      text.includes("wheelchair")
    );
  });

  return {
    stats,
    trendingEntities,
    breakingClusterIds,
    activeEventIds,
    hasAccessibilityNews,
    computedAt: nowMs,
  };
}
