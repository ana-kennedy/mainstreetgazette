// Phase 14 — Media Hub types
// Depends on: Phase 1 (Source/FeedItem), Phase 3 (StoryCluster), Phase 4 (ClassificationResult)

export type MediaHubItemType = "video" | "podcast" | "community";

// Mirrors the deduplication behavior from data/media-types.json
export type MediaDedupeRole =
  | "canonical_text"        // articles — dedupe by content hash
  | "related_media"         // video/podcast — keep alongside article
  | "community_context"     // reddit/forum — keep as separate context
  | "duplicate_unless_unique"; // social posts — drop if article exists

export interface MediaHubItem {
  id: string;
  feedItemId: string;
  type: MediaHubItemType;
  title: string;
  sourceName: string;
  sourceId: string;
  publishedAt: string;
  thumbnailURL?: string;
  artworkURL?: string;
  durationSeconds?: number;
  isOfficial: boolean;
  score: number;
  clusterId?: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export interface MediaHub {
  videos: MediaHubItem[];
  podcasts: MediaHubItem[];
  officialVideos: MediaHubItem[];
  computedAt: number;
}
