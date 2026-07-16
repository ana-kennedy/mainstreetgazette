// Phase 8 — Discovery Engine types
// Depends on: Phase 3 (StoryCluster), Phase 7 (UserPersonalizationPreferences)

export type DiscoveryReasonId =
  | "because_you_follow_entity"
  | "because_you_follow_park"
  | "because_you_follow_topic"
  | "new_from_favorite_source"
  | "recommended_video"
  | "recommended_podcast"
  | "trending_near_interests"
  | "breaking_near_interests";

export type DiscoveryMediaLabel =
  | "article"
  | "video"
  | "podcast"
  | "community"
  | "official";

export interface DiscoveryItem {
  id: string;
  itemType: "cluster" | "feedItem";
  headline: string;
  summary?: string;
  mediaLabel: DiscoveryMediaLabel;
  sourceName?: string;
  publishedAt?: string;
  score: number;
  reason: DiscoveryReasonId;
  reasonLabel: string;
  primaryItemId?: string;
  clusterId?: string;
  hasOfficialSource?: boolean;
  isBreaking?: boolean;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export interface DiscoverySection {
  id: string;
  label: string;
  priority: number;
  items: DiscoveryItem[];
}

export interface DiscoveryFeed {
  sections: DiscoverySection[];
  computedAt: number;
  hasFollows: boolean;
}
