import { parseSearchQuery } from "./searchNormalizer";
import { rankSearchItem } from "./searchRanker";
import type { SearchOptions, SearchResult, SearchableItem } from "./searchTypes";

const DAY_MS = 24 * 60 * 60 * 1000;

function isWithinTimelineFilter(
  publishedAt: string | undefined,
  filter: SearchOptions["timelineFilter"]
): boolean {
  if (!filter || filter === "latest" || filter === "all_time") return true;
  if (!publishedAt) return true;
  const date = new Date(publishedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  switch (filter) {
    case "today":
      return date.toDateString() === now.toDateString();
    case "yesterday": {
      const yesterday = new Date(now.getTime() - DAY_MS);
      return date.toDateString() === yesterday.toDateString();
    }
    case "last_3_days":
      return diffMs >= 0 && diffMs <= 3 * DAY_MS;
    case "this_week":
      return diffMs >= 0 && diffMs <= 7 * DAY_MS;
    case "this_month":
      return diffMs >= 0 && diffMs <= 31 * DAY_MS;
    case "disney_history":
      return diffMs > 365 * DAY_MS;
    default:
      return true;
  }
}

export function searchMainStreetGazette(
  query: string,
  items: SearchableItem[],
  options: SearchOptions = {}
): SearchResult[] {
  const parsed = parseSearchQuery(query);
  const timelineFilter = options.timelineFilter ?? parsed.timelineFilter;
  const effectiveMediaTypes =
    parsed.mediaTypes.length > 0 ? parsed.mediaTypes : [];
  const isOfficialOnly = options.officialOnly || parsed.officialOnly;

  const { quickFilter } = options;

  const filtered = items.filter((item) => {
    // Hidden source exclusion
    if (options.hiddenSourceIds?.includes(item.sourceId ?? "")) return false;

    // Quick filter: Stories
    if (quickFilter === "stories") return item.resultType === "story";

    // Quick filter: Official
    if (quickFilter === "official") return item.sourceTrust === "official";

    // Quick filter: media type (article / video / podcast / community)
    // "stories" and "official" already handled by early returns above
    if (quickFilter && quickFilter !== "all") {
      if (item.mediaType !== quickFilter) return false;
    }

    // Query-detected media type filter (e.g. "videos only")
    if (effectiveMediaTypes.length > 0 && item.mediaType) {
      if (!effectiveMediaTypes.includes(item.mediaType)) return false;
    }

    // Official-only mode (from query or options)
    if (isOfficialOnly && item.sourceTrust !== "official") return false;

    // Location filter
    if (
      options.locationIds?.length &&
      item.locationIds?.length &&
      !item.locationIds.some((id) => options.locationIds!.includes(id))
    ) {
      return false;
    }

    // Park filter
    if (
      options.parkIds?.length &&
      item.parkIds?.length &&
      !item.parkIds.some((id) => options.parkIds!.includes(id))
    ) {
      return false;
    }

    // Timeline filter
    if (!isWithinTimelineFilter(item.publishedAt ?? item.updatedAt, timelineFilter)) return false;

    return true;
  });

  return filtered
    .map((item) => rankSearchItem(parsed, item))
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 100);
}
