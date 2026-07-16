export type TimelineBucket =
  | "breaking"
  | "today"
  | "yesterday"
  | "last3Days"
  | "thisWeek"
  | "thisMonth"
  | "older"
  | "upcoming"
  | "history"
  | "saved"
  | "official";

export type LifecycleStage =
  | "rumor"
  | "leaked"
  | "permitFiled"
  | "officiallyAnnounced"
  | "constructionStarted"
  | "testing"
  | "openingDateAnnounced"
  | "nowOpen"
  | "reviewPhase"
  | "closureAnnounced"
  | "temporarilyClosed"
  | "refurbishment"
  | "delayed"
  | "canceled"
  | "completed"
  | "historical";

export interface TimelineMetadata {
  firstSeenAt: string;
  latestUpdateAt: string;
  primaryPublishedAt: string;
  eventDate?: string;
  timelineBucket: TimelineBucket;
  lifecycleStage: LifecycleStage;
  importanceScore: number;
  freshnessScore: number;
  updateCount24h: number;
  hasOfficialSource: boolean;
  hasVideo: boolean;
  hasPodcast: boolean;
  hasCommunityDiscussion: boolean;
}

export interface CoverageCounts {
  articles: number;
  videos: number;
  podcasts: number;
  community: number;
  official: number;
}

export interface TimelineStory {
  id: string;
  headline: string;
  summary: string;
  primaryLocationId?: string;
  primaryParkId?: string;
  relatedEntityIds: string[];
  topics: string[];
  timeline: TimelineMetadata;
  coverageCounts: CoverageCounts;
  isSaved?: boolean;
  isRead?: boolean;
}

export interface TimelineFilter {
  id: string;
  label: string;
  description: string;
  default?: boolean;
  dateRange?: "today" | "yesterday" | "last3Days" | "thisWeek" | "thisMonth";
  requiresOfficialSource?: boolean;
  requiresMediaType?: "video" | "podcast" | "community";
  requiresSaved?: boolean;
  sortMode: "smartScore" | "breakingScore" | "latestUpdate";
}
