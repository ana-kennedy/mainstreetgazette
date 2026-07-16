import type { FeedItem } from "../domain/models";
import type { StoryCluster } from "../types/storyTypes";
import type { PersonalizationMediaType, StoryClusterLike } from "./personalizationTypes";

function contentTypeToPersonalizationMediaType(ct: string): PersonalizationMediaType {
  switch (ct) {
    case "video": return "youtube";
    case "podcast": return "podcast";
    case "community":
    case "forum": return "community";
    case "social": return "social";
    default: return "article";
  }
}

export function clusterToStoryClusterLike(cluster: StoryCluster): StoryClusterLike {
  const uniqueSourceIds = Array.from(
    new Set(cluster.items.filter((i) => !i.isHiddenDuplicate).map((i) => i.sourceId))
  );

  const mediaTypes: PersonalizationMediaType[] = Array.from(
    new Set(cluster.contentTypes.map(contentTypeToPersonalizationMediaType))
  );

  return {
    id: cluster.clusterId,
    headline: cluster.canonicalTitle,
    sourceIds: uniqueSourceIds,
    mediaTypes,
    locationIds: cluster.locations,
    parkIds: cluster.parks,
    entityIds: cluster.entities,
    topicIds: cluster.topics,
    importanceScore: cluster.classification?.importanceScore,
    classificationConfidence: cluster.classification?.confidence,
    isOfficialAnnouncement:
      cluster.classification?.isOfficialAnnouncement || cluster.officialSourcePresent,
    isBreaking:
      cluster.classification?.recommendedDisplayTreatment === "breaking_card" ||
      cluster.breakingScore >= 70,
    isRumor: cluster.classification?.isRumorOrSpeculation,
    publishedAt: cluster.lastPublishedAt,
  };
}

// Item-level equivalent of clusterToStoryClusterLike, used when Group Stories is off and
// there's no StoryCluster to read aggregated location/park/topic/entity IDs from — FeedItem
// already carries the same enrichment fields per-item (Phase 2/4), just unaggregated.
export function feedItemToStoryClusterLike(item: FeedItem): StoryClusterLike {
  return {
    id: item.id,
    headline: item.title,
    sourceIds: [item.sourceID],
    mediaTypes: [contentTypeToPersonalizationMediaType(item.contentType)],
    locationIds: item.primaryLocationId ? [item.primaryLocationId] : [],
    parkIds: item.primaryParkId ? [item.primaryParkId] : [],
    entityIds: (item.entityMatches ?? []).map((m) => m.entityId),
    topicIds: (item.topicMatches ?? []).map((m) => m.topicId),
    importanceScore: item.classification?.importanceScore,
    classificationConfidence: item.classification?.confidence,
    isOfficialAnnouncement: item.classification?.isOfficialAnnouncement || item.trustLabel === "official",
    isBreaking: item.classification?.recommendedDisplayTreatment === "breaking_card",
    isRumor: item.classification?.isRumorOrSpeculation,
    publishedAt: item.publishedAt,
  };
}
