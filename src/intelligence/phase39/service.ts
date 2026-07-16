// Phase 39 — Feed Intelligence Engine service

import type {
  FeedIntelligenceInput,
  FeedIntelligenceOutput,
  SourceFetchRecord,
  SourcePriorityLevel,
} from "./types";

// Minimum intervals between fetches per source type (ms)
const BASE_INTERVAL_MS: Record<string, number> = {
  rssArticle: 15 * 60_000,     // 15 min
  youtubeChannel: 30 * 60_000, // 30 min
  podcastRSS: 60 * 60_000,     // 1 hour
  redditFeed: 20 * 60_000,     // 20 min
};

// Backoff schedule: nth failure → skip duration (ms)
const BACKOFF_MS = [
  2 * 60_000,   // 1st failure: 2 min
  5 * 60_000,   // 2nd: 5 min
  15 * 60_000,  // 3rd: 15 min
  30 * 60_000,  // 4+: 30 min
];

const PRIORITY_SCORE: Record<SourcePriorityLevel, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
  paused: 0,
};

function getSourcePriority(
  sourceType: string,
  isOfficial: boolean,
  failureCount: number,
): SourcePriorityLevel {
  if (failureCount >= 5) return "paused";
  if (failureCount >= 3) return "low";
  if (isOfficial) return "critical";
  if (sourceType === "rssArticle") return "high";
  if (sourceType === "redditFeed") return "low";
  return "normal";
}

function getAdaptiveInterval(sourceType: string, hasConditionalHeaders: boolean): number {
  const base = BASE_INTERVAL_MS[sourceType] ?? 20 * 60_000;
  // Sources supporting ETag/Last-Modified can poll more frequently (lower bandwidth cost)
  return hasConditionalHeaders ? Math.max(base * 0.75, 10 * 60_000) : base;
}

/**
 * Build a prioritised fetch queue for a cycle.
 * Returns sources sorted by priority (critical first), with backoff sources marked as skip.
 */
export function buildFeedFetchQueue(input: FeedIntelligenceInput): FeedIntelligenceOutput {
  const { sources, metas, cycleStartMs } = input;

  const records: SourceFetchRecord[] = sources
    .filter((s) => s.isEnabled)
    .map((source) => {
      const meta = metas[source.id] ?? {};
      const failureCount = meta.failureCount ?? 0;
      const isOfficial = source.officialStatus === "Official";
      const priority = getSourcePriority(source.sourceType, isOfficial, failureCount);

      // Check backoff
      let skip = false;
      let skipReason: SourceFetchRecord["skipReason"];

      if (meta.nextRetryAt) {
        const retryAt = new Date(meta.nextRetryAt).getTime();
        if (cycleStartMs < retryAt) {
          skip = true;
          skipReason = "backoff";
        }
      }

      if (priority === "paused") {
        skip = true;
        skipReason = "backoff";
      }

      const hasConditionalHeaders = Boolean(meta.etag ?? meta.lastModified);
      const intervalMs = getAdaptiveInterval(source.sourceType, hasConditionalHeaders);

      return { sourceId: source.id, priority, intervalMs, skip, skipReason };
    });

  // Sort: non-skipped first, then by priority score descending
  records.sort((a, b) => {
    if (a.skip !== b.skip) return a.skip ? 1 : -1;
    return (PRIORITY_SCORE[b.priority] ?? 0) - (PRIORITY_SCORE[a.priority] ?? 0);
  });

  const skippedCount = records.filter((r) => r.skip).length;
  const urgentCount = records.filter(
    (r) => !r.skip && (r.priority === "critical" || r.priority === "high"),
  ).length;

  return { queue: records, skippedCount, urgentCount };
}

/** Recommend a next cycle interval based on urgency of the current queue. */
export function recommendNextCycleIntervalMs(output: FeedIntelligenceOutput): number {
  if (output.urgentCount > 0) return 10 * 60_000;   // 10 min if urgent sources
  if (output.skippedCount === output.queue.length) return 30 * 60_000; // all skipped
  return 15 * 60_000; // default
}
