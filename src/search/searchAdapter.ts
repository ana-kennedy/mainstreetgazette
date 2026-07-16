import type { FeedItem, Source } from "../domain/models";
import type { StoryCluster } from "../types/storyTypes";
import type { SearchableItem, SearchMediaType } from "./searchTypes";

function contentTypeToMediaType(ct: string): SearchMediaType {
  if (ct === "video") return "video";
  if (ct === "podcast") return "podcast";
  if (ct === "community" || ct === "forum" || ct === "social") return "community";
  return "article";
}

function itemTrustLevel(
  item: FeedItem,
  source?: Source
): "official" | "high" | "medium" | "low" {
  if (source?.officialStatus === "Official" || item.trustLabel === "official") return "official";
  if (item.trustLabel === "verifiedNews") return "high";
  if (item.sourceType === "rssArticle") return "high";
  if (item.sourceType === "youtubeChannel" || item.sourceType === "podcastRSS") return "medium";
  return "low";
}

function buildEntityBodyText(item: FeedItem): string {
  const parts: string[] = [];
  if (item.entityMatches?.length) {
    parts.push(item.entityMatches.map((e) => e.entityName).join(" "));
    parts.push(item.entityMatches.flatMap((e) => e.matchedKeywords).join(" "));
  }
  if (item.topicMatches?.length) {
    parts.push(item.topicMatches.map((t) => t.topicName).join(" "));
  }
  if (item.classification?.topics?.length) {
    parts.push(item.classification.topics.join(" "));
  }
  return parts.filter(Boolean).join(" ");
}

export function feedItemToSearchableItem(item: FeedItem, source?: Source): SearchableItem {
  const rawMediaType = contentTypeToMediaType(item.contentType);
  const trust = itemTrustLevel(item, source);
  const mediaType: SearchMediaType = trust === "official" ? "official" : rawMediaType;

  return {
    id: item.id,
    resultType: "contentItem",
    title: item.title,
    subtitle: item.authorOrChannel ?? source?.name,
    summary: item.summary ?? undefined,
    bodyText: buildEntityBodyText(item),
    sourceId: item.sourceID,
    sourceName: source?.name ?? item.authorOrChannel ?? undefined,
    sourceTrust: trust,
    mediaType,
    entityIds: item.entityMatches?.map((e) => e.entityId) ?? [],
    locationIds: item.primaryLocationId ? [item.primaryLocationId] : [],
    parkIds: item.primaryParkId ? [item.primaryParkId] : [],
    topics: item.classification?.topics ?? [],
    publishedAt: item.publishedAt,
    canonicalUrl: item.canonicalURL,
    classifierConfidence: item.classification?.confidence,
  };
}

export function storyClusterToSearchableItem(cluster: StoryCluster): SearchableItem {
  const entityNames = cluster.entities.join(" ");
  const topicText = cluster.topics.join(" ");

  return {
    id: cluster.clusterId,
    resultType: "story",
    title: cluster.canonicalTitle,
    subtitle: `${cluster.sourceCount} ${cluster.sourceCount === 1 ? "source" : "sources"}`,
    summary: cluster.shortSummary,
    bodyText: [entityNames, topicText].filter(Boolean).join(" "),
    sourceTrust: cluster.officialSourcePresent ? "official" : "high",
    mediaType: cluster.officialSourcePresent ? "official" : "article",
    entityIds: cluster.entities,
    locationIds: cluster.locations,
    parkIds: cluster.parks,
    topics: cluster.topics,
    publishedAt: cluster.lastPublishedAt,
    updatedAt: cluster.lastPublishedAt,
    classifierConfidence: cluster.classification?.confidence,
  };
}
