// Phase 39 — Feed Intelligence Engine types

export type SourcePriorityLevel = "critical" | "high" | "normal" | "low" | "paused";

export interface SourceFetchRecord {
  sourceId: string;
  priority: SourcePriorityLevel;
  /** Recommended minimum interval (ms) before next fetch */
  intervalMs: number;
  /** Whether this source should be skipped on this cycle */
  skip: boolean;
  skipReason?: "backoff" | "rate_limited" | "low_priority_cycle";
}

export interface FeedIntelligenceInput {
  sources: Array<{
    id: string;
    sourceType: "rssArticle" | "youtubeChannel" | "podcastRSS" | "redditFeed";
    officialStatus?: string;
    isEnabled: boolean;
  }>;
  metas: Record<string, {
    failureCount?: number;
    nextRetryAt?: string;
    etag?: string;
    lastModified?: string;
  }>;
  /** Unix timestamp (ms) of this cycle's start */
  cycleStartMs: number;
}

export interface FeedIntelligenceOutput {
  /** Sources in fetch priority order — highest priority first */
  queue: SourceFetchRecord[];
  /** How many sources were skipped this cycle */
  skippedCount: number;
  /** How many critical/high sources are queued */
  urgentCount: number;
}
