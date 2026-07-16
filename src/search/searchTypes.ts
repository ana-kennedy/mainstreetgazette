export type SearchMediaType = "article" | "video" | "podcast" | "community" | "official";
export type SearchResultType = "story" | "contentItem" | "entity" | "source";
export type SearchTimelineFilter =
  | "latest"
  | "today"
  | "yesterday"
  | "last_3_days"
  | "this_week"
  | "this_month"
  | "all_time"
  | "disney_history";

export type SearchQuickFilter =
  | "all"
  | "stories"
  | "article"
  | "video"
  | "podcast"
  | "community"
  | "official";

export interface ParsedSearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  tokens: string[];
  detectedEntityIds: string[];
  detectedLocationIds: string[];
  detectedParkIds: string[];
  detectedTopics: string[];
  mediaTypes: SearchMediaType[];
  timelineFilter: SearchTimelineFilter;
  officialOnly: boolean;
}

export interface SearchableItem {
  id: string;
  resultType: SearchResultType;
  title: string;
  subtitle?: string;
  summary?: string;
  bodyText?: string;
  sourceId?: string;
  sourceName?: string;
  sourceTrust?: "official" | "high" | "medium" | "low";
  mediaType?: SearchMediaType;
  entityIds?: string[];
  locationIds?: string[];
  parkIds?: string[];
  topics?: string[];
  publishedAt?: string;
  updatedAt?: string;
  canonicalUrl?: string;
  isPromotionalDuplicate?: boolean;
  classifierConfidence?: number;
}

export interface SearchResult {
  id: string;
  resultType: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  sourceName?: string;
  mediaType?: SearchMediaType;
  score: number;
  matchedReasons: string[];
  originalItem: SearchableItem;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export interface SearchOptions {
  quickFilter?: SearchQuickFilter;
  timelineFilter?: SearchTimelineFilter;
  officialOnly?: boolean;
  locationIds?: string[];
  parkIds?: string[];
  hiddenSourceIds?: string[];
  limit?: number;
}
