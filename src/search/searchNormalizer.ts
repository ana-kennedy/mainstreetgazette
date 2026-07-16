import type { ParsedSearchQuery, SearchMediaType, SearchTimelineFilter } from "./searchTypes";

const MEDIA_TYPE_WORDS: Record<string, SearchMediaType> = {
  article: "article",
  articles: "article",
  video: "video",
  videos: "video",
  youtube: "video",
  podcast: "podcast",
  podcasts: "podcast",
  community: "community",
  reddit: "community",
  forum: "community",
  official: "official",
  announcement: "official",
  announcements: "official",
};

const TIMELINE_PATTERNS: Array<{ patterns: string[]; id: SearchTimelineFilter }> = [
  { patterns: ["today"], id: "today" },
  { patterns: ["yesterday"], id: "yesterday" },
  { patterns: ["last 3 days", "last three days", "3 days"], id: "last_3_days" },
  { patterns: ["this week", "week"], id: "this_week" },
  { patterns: ["this month", "month"], id: "this_month" },
  { patterns: ["all time", "all time"], id: "all_time" },
  { patterns: ["history", "historical", "archive"], id: "disney_history" },
];

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSearchQuery(rawQuery: string): ParsedSearchQuery {
  const normalizedQuery = normalizeText(rawQuery);
  const tokens = normalizedQuery.length > 0 ? normalizedQuery.split(" ").filter(Boolean) : [];
  const mediaTypes = new Set<SearchMediaType>();

  for (const token of tokens) {
    const mt = MEDIA_TYPE_WORDS[token];
    if (mt) mediaTypes.add(mt);
  }

  let timelineFilter: SearchTimelineFilter = "latest";
  for (const entry of TIMELINE_PATTERNS) {
    if (entry.patterns.some((p) => normalizedQuery.includes(p))) {
      timelineFilter = entry.id;
      break;
    }
  }

  return {
    rawQuery,
    normalizedQuery,
    tokens,
    detectedEntityIds: [],
    detectedLocationIds: [],
    detectedParkIds: [],
    detectedTopics: [],
    mediaTypes: Array.from(mediaTypes),
    timelineFilter,
    officialOnly:
      normalizedQuery.includes("official") || normalizedQuery.includes("announcement"),
  };
}
