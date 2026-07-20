import type { FeedItem } from "../domain/models";
import destinationsData from "../data/exploreDestinations.json";
import type { ExploreDestination } from "../types/exploreTypes";

export type DestinationMediaType = "stories" | "podcasts" | "videos" | "community" | "all";

export const exploreDestinations = destinationsData.destinations as ExploreDestination[];

export function getDestination(destinationId: string): ExploreDestination | undefined {
  return exploreDestinations.find((destination) => destination.id === destinationId);
}

export function getChildDestinations(parentId: string): ExploreDestination[] {
  return exploreDestinations.filter((destination) => destination.parentId === parentId);
}

function mediaTypeMatches(item: FeedItem, mediaType: DestinationMediaType): boolean {
  if (mediaType === "all") return true;
  if (mediaType === "stories") return item.contentType === "article";
  if (mediaType === "podcasts") return item.contentType === "podcast";
  if (mediaType === "videos") return item.contentType === "video";
  return item.contentType === "community";
}

function searchableText(item: FeedItem): string {
  return [
    item.title,
    item.subtitle,
    item.summary,
    item.authorOrChannel,
    item.primaryLocationId,
    item.primaryParkId,
    ...(item.tags ?? []),
    ...(item.entityMatches ?? []).flatMap((match) => [match.entityName, match.entityId, match.locationId, match.parkId ?? ""]),
    ...(item.topicMatches ?? []).flatMap((match) => [match.topicName, match.topicId]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const cruiseTerms = [
  "disney cruise line",
  "dcl",
  "castaway cay",
  "lookout cay",
  "lighthouse point",
  "disney magic",
  "disney wonder",
  "disney dream",
  "disney fantasy",
  "disney wish",
  "disney treasure",
  "disney destiny",
  "disney adventure",
];

function cruiseFallbackMatches(item: FeedItem, destination: ExploreDestination): boolean {
  if (destination.type !== "cruise_line" && destination.type !== "cruise_ship" && destination.type !== "private_destination") {
    return false;
  }
  const text = searchableText(item);
  if (destination.type === "cruise_ship") return text.includes(destination.name.toLowerCase());
  if (destination.type === "private_destination") return text.includes(destination.name.toLowerCase());
  return cruiseTerms.some((term) => text.includes(term));
}

function destinationMatches(item: FeedItem, destination: ExploreDestination): boolean {
  const tags = item.tags ?? [];
  const requiredTags = new Set(destination.tagKeys);
  return tags.some((tag) => requiredTags.has(tag)) || cruiseFallbackMatches(item, destination);
}

function uniqueSorted(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.canonicalURL || item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function filterItemsForDestination(
  items: FeedItem[],
  destination: ExploreDestination,
  mediaType: DestinationMediaType,
): FeedItem[] {
  return uniqueSorted(
    items
      .filter((item) => mediaTypeMatches(item, mediaType))
      .filter((item) => destinationMatches(item, destination))
  );
}

export function filterAggregateItemsForDestination(
  items: FeedItem[],
  destination: ExploreDestination,
  mediaType: DestinationMediaType,
): FeedItem[] {
  const children = getChildDestinations(destination.id);
  const allDestinations = [destination, ...children];
  return uniqueSorted(
    items
      .filter((item) => mediaTypeMatches(item, mediaType))
      .filter((item) => allDestinations.some((candidate) => destinationMatches(item, candidate)))
  );
}

export function filterResortWideItems(
  items: FeedItem[],
  resort: ExploreDestination,
  mediaType: DestinationMediaType = "all",
): FeedItem[] {
  const children = getChildDestinations(resort.id);
  const childTags = new Set(children.flatMap((child) => child.tagKeys));
  const resortTags = new Set(resort.tagKeys);
  return uniqueSorted(
    items
      .filter((item) => mediaTypeMatches(item, mediaType))
      .filter((item) => {
        const tags = item.tags ?? [];
        const explicitlyResort = tags.some((tag) => resortTags.has(tag));
        const childSpecific = tags.some((tag) => childTags.has(tag));
        return explicitlyResort && !childSpecific;
      })
  );
}
