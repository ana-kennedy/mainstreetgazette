// Phase 11 — Trending Engine types
// Depends on: Phase 3 (StoryCluster), Phase 4 (ClassificationResult), Phase 7 (UserPersonalizationPreferences)

export interface TrendingEntry {
  clusterId: string;
  primaryItemId: string;
  headline: string;
  summary?: string;
  trendingScore: number;
  rank: number;
  // velocity = items added to this cluster in the last 24 hours
  velocity: number;
  sourceCount: number;
  communityCount: number;
  isBreaking: boolean;
  isOfficial: boolean;
  parkIds: string[];
  topicIds: string[];
  publishedAt: string;
  accessibilityLabel: string;
}

export interface TrendingTopic {
  topicId: string;
  label: string;
  clusterCount: number;
  totalSourceCount: number;
  velocity: number;
  trendingScore: number;
}

export interface TrendingMediaEntry {
  mediaType: "video" | "podcast" | "community";
  clusterId: string;
  primaryItemId: string;
  headline: string;
  sourceName?: string;
  trendingScore: number;
}

export interface SourceVelocityEntry {
  sourceId: string;
  sourceName: string;
  itemsLast24h: number;
  itemsLast6h: number;
  trendingScore: number;
}

export interface TrendingFeed {
  trendingStories: TrendingEntry[];
  fastestGrowing: TrendingEntry[];
  mostDiscussedTopics: TrendingTopic[];
  // Top trending cluster per park, keyed by parkId
  trendingByPark: Record<string, TrendingEntry>;
  trendingVideos: TrendingMediaEntry[];
  trendingPodcasts: TrendingMediaEntry[];
  sourceVelocity: SourceVelocityEntry[];
  computedAt: number;
}
