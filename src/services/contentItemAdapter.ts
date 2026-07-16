import type { FeedItem, Source, SourceType } from "../domain/models";
import type { ContentItem, PlatformType, StoryContentType } from "../types/storyTypes";

function sourceTypeToPlatform(sourceType: SourceType): PlatformType {
  switch (sourceType) {
    case "youtubeChannel": return "youtube";
    case "podcastRSS": return "podcast";
    case "redditFeed": return "reddit";
    default: return "rss";
  }
}

function officialityToTrustScore(source: Source | undefined): number {
  if (!source) return 50;
  if (source.officialStatus === "Official") return 100;
  if (source.trustPriority != null) return Math.min(source.trustPriority, 89);
  if (source.trustLabel === "verifiedNews") return 70;
  return 50;
}

export function adaptFeedItemToContentItem(
  item: FeedItem,
  sourcesByID: Map<string, Source>
): ContentItem {
  const source = sourcesByID.get(item.sourceID);
  return {
    itemId: item.id,
    sourceId: item.sourceID,
    sourceName: source?.name ?? item.authorOrChannel ?? "Unknown",
    platform: sourceTypeToPlatform(item.sourceType),
    contentType: item.contentType as StoryContentType,
    title: item.title,
    summary: item.summary ?? undefined,
    url: item.canonicalURL,
    canonicalUrl: item.canonicalURL,
    publishedAt: item.publishedAt,
    imageUrl: item.thumbnailURL ?? item.artworkURL ?? undefined,
    locations: item.primaryLocationId ? [item.primaryLocationId] : [],
    parks: item.primaryParkId ? [item.primaryParkId] : [],
    entities: item.entityMatches?.map((m) => m.entityName) ?? [],
    topics: item.topicMatches?.map((m) => m.topicName) ?? [],
    eventActions: [],
    datesMentioned: [],
    sourceTrustScore: officialityToTrustScore(source),
    classification: item.classification,
  };
}

export function adaptFeedItemsToContentItems(
  items: FeedItem[],
  sources: Source[]
): ContentItem[] {
  const sourcesByID = new Map(sources.map((s) => [s.id, s]));
  return items.map((item) => adaptFeedItemToContentItem(item, sourcesByID));
}
