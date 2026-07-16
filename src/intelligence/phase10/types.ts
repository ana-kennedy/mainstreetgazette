// Phase 10 — Collections types
// Depends on: Phase 3 (StoryCluster), Phase 4 (ClassificationResult), Phase 7 (UserPersonalizationPreferences)

export type CollectionType = "editorial" | "automatic";
export type CollectionStatus = "active" | "seasonal" | "upcoming" | "archived";

// Persisted definition — editorial ones come from JSON, automatic ones are generated at runtime
export interface CollectionDefinition {
  id: string;
  title: string;
  description?: string;
  icon?: string;            // MaterialCommunityIcons name
  type: CollectionType;
  status: CollectionStatus;
  entityIds?: string[];     // entity IDs that qualify a cluster
  parkIds?: string[];       // park IDs that qualify a cluster
  topicIds?: string[];      // topic IDs that qualify a cluster
  keywords?: string[];      // headline keyword match (lowercased, any match qualifies)
  startDate?: string;       // ISO — seasonal collections only show in range
  endDate?: string;
}

// A single cluster included in a collection
export interface CollectionCluster {
  clusterId: string;
  primaryItemId: string;
  headline: string;
  summary?: string;
  publishedAt: string;
  sourceName?: string;
  sourceCount: number;
  articleCount: number;
  videoCount: number;
  podcastCount: number;
  communityCount: number;
  isBreaking: boolean;
  isOfficial: boolean;
}

// Runtime view of a collection with live cluster data
export interface LiveCollection {
  definition: CollectionDefinition;
  clusters: CollectionCluster[];
  totalCount: number;
  latestPublishedAt?: string;
  isSaved: boolean;
  mediaBreakdown: {
    articles: number;
    videos: number;
    podcasts: number;
    community: number;
  };
}
