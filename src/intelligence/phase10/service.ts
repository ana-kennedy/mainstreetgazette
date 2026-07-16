// Phase 10 — Collections service
// Depends on:
//   Phase 2 (Disney entities) — entityIds, parkIds, topicIds for matching
//   Phase 3 (StoryCluster) — clusters to match against collection definitions
//   Phase 4 (ClassificationResult) — isOfficialAnnouncement, breakingScore

import type { StoryCluster } from "../../types/storyTypes";
import {
  AUTO_COLLECTION_MIN_CLUSTERS,
  AUTO_COLLECTION_MAX,
  COLLECTION_SHELF_PREVIEW_COUNT,
  iconForCollection,
} from "./rules";
import type { CollectionCluster, CollectionDefinition, LiveCollection } from "./types";

// ── Cluster → CollectionCluster adapter ──────────────────────────────────────

function toCollectionCluster(cluster: StoryCluster): CollectionCluster {
  return {
    clusterId: cluster.clusterId,
    primaryItemId: cluster.primaryItemId,
    headline: cluster.canonicalTitle,
    summary: cluster.shortSummary || undefined,
    publishedAt: cluster.lastPublishedAt,
    sourceName: cluster.items[0]?.sourceName,
    sourceCount: cluster.sourceCount,
    articleCount: cluster.articleCount,
    videoCount: cluster.videoCount,
    podcastCount: cluster.podcastCount,
    communityCount: cluster.communityCount,
    isBreaking: cluster.breakingScore >= 70,
    isOfficial:
      (cluster.classification?.isOfficialAnnouncement ?? false) ||
      cluster.officialSourcePresent,
  };
}

// ── Matching ──────────────────────────────────────────────────────────────────

export function matchClusterToCollection(
  cluster: StoryCluster,
  def: CollectionDefinition,
): boolean {
  // Seasonal: skip if outside date range
  if (def.startDate || def.endDate) {
    const now = Date.now();
    if (def.startDate && now < new Date(def.startDate).getTime()) return false;
    if (def.endDate && now > new Date(def.endDate).getTime()) return false;
  }

  if (def.entityIds?.some((e) => cluster.entities.includes(e))) return true;
  if (def.parkIds?.some((p) => cluster.parks.includes(p))) return true;
  if (def.topicIds?.some((t) => cluster.topics.includes(t))) return true;

  if (def.keywords && def.keywords.length > 0) {
    const haystack = cluster.canonicalTitle.toLowerCase();
    if (def.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) return true;
  }

  return false;
}

// ── Build a single live collection ───────────────────────────────────────────

export function buildLiveCollection(
  def: CollectionDefinition,
  clusters: StoryCluster[],
  savedCollectionIDs: string[],
): LiveCollection {
  const matched = clusters
    .filter((c) => matchClusterToCollection(c, def))
    .sort((a, b) => new Date(b.lastPublishedAt).getTime() - new Date(a.lastPublishedAt).getTime())
    .slice(0, COLLECTION_SHELF_PREVIEW_COUNT);

  const all = clusters.filter((c) => matchClusterToCollection(c, def));
  const mediaBreakdown = all.reduce(
    (acc, c) => ({
      articles: acc.articles + c.articleCount,
      videos: acc.videos + c.videoCount,
      podcasts: acc.podcasts + c.podcastCount,
      community: acc.community + c.communityCount,
    }),
    { articles: 0, videos: 0, podcasts: 0, community: 0 },
  );

  return {
    definition: def,
    clusters: matched.map(toCollectionCluster),
    totalCount: all.length,
    latestPublishedAt: all[0]?.lastPublishedAt,
    isSaved: savedCollectionIDs.includes(def.id),
    mediaBreakdown,
  };
}

// ── Build all editorial collections ──────────────────────────────────────────

export function buildAllCollections(
  clusters: StoryCluster[],
  definitions: CollectionDefinition[],
  savedCollectionIDs: string[],
): LiveCollection[] {
  return definitions
    .filter((def) => def.status !== "archived")
    .map((def) => buildLiveCollection(def, clusters, savedCollectionIDs))
    .filter((col) => col.totalCount > 0)
    .sort((a, b) => {
      // Saved collections first, then by recency
      if (a.isSaved !== b.isSaved) return a.isSaved ? -1 : 1;
      const aDate = a.latestPublishedAt ? new Date(a.latestPublishedAt).getTime() : 0;
      const bDate = b.latestPublishedAt ? new Date(b.latestPublishedAt).getTime() : 0;
      return bDate - aDate;
    });
}

// ── Auto-collection generation from cluster entity/topic co-occurrence ────────
// Surfaces "rising topics" when 3+ clusters share the same entity or topic
// and that entity/topic isn't already covered by an editorial collection.

export function buildAutoCollections(
  clusters: StoryCluster[],
  existingDefinitionIds: Set<string>,
): CollectionDefinition[] {
  const entityCount = new Map<string, number>();
  const topicCount = new Map<string, number>();

  for (const cluster of clusters) {
    for (const e of cluster.entities) {
      entityCount.set(e, (entityCount.get(e) ?? 0) + 1);
    }
    for (const t of cluster.topics) {
      topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
    }
  }

  const autoDefs: CollectionDefinition[] = [];

  // Entity-based auto-collections
  for (const [entityId, count] of entityCount.entries()) {
    if (count < AUTO_COLLECTION_MIN_CLUSTERS) continue;
    const autoId = `auto_entity_${entityId}`;
    if (existingDefinitionIds.has(autoId)) continue;
    autoDefs.push({
      id: autoId,
      title: entityId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      type: "automatic",
      status: "active",
      entityIds: [entityId],
    });
  }

  // Topic-based auto-collections
  for (const [topicId, count] of topicCount.entries()) {
    if (count < AUTO_COLLECTION_MIN_CLUSTERS) continue;
    const autoId = `auto_topic_${topicId}`;
    if (existingDefinitionIds.has(autoId)) continue;
    autoDefs.push({
      id: autoId,
      title: topicId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      type: "automatic",
      status: "active",
      topicIds: [topicId],
    });
  }

  // Sort by cluster count descending and cap
  return autoDefs
    .sort((a, b) => {
      const countA =
        (a.entityIds?.[0] ? (entityCount.get(a.entityIds[0]) ?? 0) : 0) +
        (a.topicIds?.[0] ? (topicCount.get(a.topicIds[0]) ?? 0) : 0);
      const countB =
        (b.entityIds?.[0] ? (entityCount.get(b.entityIds[0]) ?? 0) : 0) +
        (b.topicIds?.[0] ? (topicCount.get(b.topicIds[0]) ?? 0) : 0);
      return countB - countA;
    })
    .slice(0, AUTO_COLLECTION_MAX)
    .map((def) => ({ ...def, icon: iconForCollection(def.title) }));
}
