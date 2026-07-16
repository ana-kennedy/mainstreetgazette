export type PersonalizationMediaType =
  | "article"
  | "youtube"
  | "podcast"
  | "community"
  | "social"
  | "official";

export type NewsFeedMode =
  | "all"
  | "personalized"
  | "latest"
  | "favorites"
  | "official"
  | "articles"
  | "videos"
  | "podcasts"
  | "community";

export type NotificationProfileId = "quiet" | "balanced" | "breaking_heavy";

export interface SavedSearchPreference {
  id: string;
  label: string;
  query: string;
  filters?: Record<string, unknown>;
  notify?: boolean;
}

export interface SavedTimelineViewPreference {
  id: string;
  label: string;
  timelineFilterId: string;
  entityIds?: string[];
  topicIds?: string[];
  sourceIds?: string[];
  notify?: boolean;
}

export interface AccessibilityPersonalizationPreferences {
  useCompactRows: boolean;
  announceWhyRecommended: boolean;
  includeSourceCountInLabels: boolean;
  includeMediaTypeInLabels: boolean;
}

export interface UserPersonalizationPreferences {
  version: number;
  favoriteLocations: string[];
  favoriteParks: string[];
  favoriteEntities: string[];
  favoriteTopics: string[];
  mutedLocations: string[];
  mutedParks: string[];
  mutedEntities: string[];
  mutedTopics: string[];
  mutedSources: string[];
  preferredSources: string[];
  preferredMediaTypes: PersonalizationMediaType[];
  hiddenMediaTypes: PersonalizationMediaType[];
  sourceDisplayMode: "balanced" | "preferred_first" | "official_first";
  newsFeedMode: NewsFeedMode;
  timelineDefault: string;
  notificationProfile: NotificationProfileId;
  breakingNewsOnly: boolean;
  allowOfficialAnnouncementsAlways: boolean;
  allowHighConfidenceSafetyOrClosureAlerts: boolean;
  savedSearches: SavedSearchPreference[];
  savedTimelineViews: SavedTimelineViewPreference[];
  accessibility: AccessibilityPersonalizationPreferences;
}

export interface PersonalizationResult {
  score: number;
  hidden: boolean;
  reasons: string[];
  matchedFavorites: string[];
  matchedMutes: string[];
}

export interface StoryClusterLike {
  id: string;
  headline: string;
  sourceIds: string[];
  mediaTypes: PersonalizationMediaType[];
  locationIds: string[];
  parkIds: string[];
  entityIds: string[];
  topicIds: string[];
  importanceScore?: number;
  classificationConfidence?: number;
  isOfficialAnnouncement?: boolean;
  isBreaking?: boolean;
  isRumor?: boolean;
  publishedAt?: string;
}
