export type PlatformType =
  | "rss"
  | "youtube"
  | "podcast"
  | "reddit"
  | "forum"
  | "x"
  | "threads"
  | "instagram"
  | "facebook"
  | "bluesky";

export type StoryContentType =
  | "article"
  | "video"
  | "podcast"
  | "community"
  | "social"
  | "forum";

export type StoryClusterStatus =
  | "new"
  | "updated"
  | "developing"
  | "confirmed"
  | "archived";

export type ClusterRole =
  | "primary"
  | "related_article"
  | "related_video"
  | "related_podcast"
  | "community_discussion"
  | "duplicate_social_reference";

export type TimelineBucket =
  | "now"
  | "today"
  | "yesterday"
  | "last3days"
  | "thisweek"
  | "thismonth"
  | "all";

export interface ContentItem {
  itemId: string;
  sourceId: string;
  sourceName: string;
  platform: PlatformType;
  contentType: StoryContentType;
  title: string;
  summary?: string;
  url: string;
  canonicalUrl?: string;
  publishedAt: string;
  imageUrl?: string;
  locations: string[];
  parks: string[];
  entities: string[];
  topics: string[];
  eventActions?: string[];
  datesMentioned?: string[];
  sourceTrustScore?: number;
  // Phase 4: AI classification
  classification?: import("./classificationTypes").ClassificationResult;
}

export interface StoryFingerprint {
  itemId: string;
  normalizedTitleTokens: string[];
  summaryTokens: string[];
  locations: string[];
  parks: string[];
  entities: string[];
  topics: string[];
  eventActions: string[];
  datesMentioned: string[];
  contentType: StoryContentType;
  platform: PlatformType;
  sourceId: string;
  canonicalUrl?: string;
  publishedAt: string;
}

export interface ClusteredItem extends ContentItem {
  clusterRole: ClusterRole;
  confidenceScore: number;
  isCanonical: boolean;
  isHiddenDuplicate: boolean;
  duplicateOfItemId?: string;
  clusteringReasons?: string[];
}

export interface StoryCluster {
  clusterId: string;
  canonicalTitle: string;
  shortSummary: string;
  primaryItemId: string;
  primarySourceId: string;
  status: StoryClusterStatus;
  createdAt: string;
  updatedAt: string;
  firstPublishedAt: string;
  lastPublishedAt: string;
  locations: string[];
  parks: string[];
  entities: string[];
  topics: string[];
  contentTypes: StoryContentType[];
  items: ClusteredItem[];
  sourceCount: number;
  articleCount: number;
  videoCount: number;
  podcastCount: number;
  communityCount: number;
  officialSourcePresent: boolean;
  breakingScore: number;
  confidenceScore: number;
  timelineBucket: TimelineBucket;
  // Phase 4: AI classification
  classification?: import("./classificationTypes").ClassificationResult;
}

export interface ClusterMatchResult {
  clusterId: string;
  score: number;
  decision: "same_story" | "related_coverage" | "related_topic" | "new_story";
  reasons: string[];
}
