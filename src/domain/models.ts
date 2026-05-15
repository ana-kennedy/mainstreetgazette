export type ArticleOpenMode = "inAppBrowser" | "safari";
export type ColorTheme = "light" | "dark" | "gazette" | "midnight" | "fantasy" | "system";
export type ContentType = "article" | "video" | "podcast";
export type DownloadState = "notDownloaded" | "queued" | "downloading" | "downloaded" | "failed";
export type SmartView =
  | "all"
  | "articles"
  | "videos"
  | "podcasts"
  | "mediaOnly"
  | "newsOnly"
  | "groupedStories"
  | "newSinceCheckpoint"
  | "saved"
  | "downloadedPodcasts"
  | "continueListening"
  | "upNext";
export type ParkFilterKey =
  | "all"
  | "magic_kingdom"
  | "epcot"
  | "hollywood_studios"
  | "animal_kingdom"
  | "disneyland"
  | "california_adventure"
  | "disneyland_paris"
  | "walt_disney_studios_paris"
  | "tokyo_disneyland"
  | "tokyo_disneysea"
  | "shanghai_disneyland"
  | "hong_kong_disneyland";

export type SortOrder = "newestFirst" | "oldestFirst";
export type SourceCategory =
  | "parksNews"
  | "food"
  | "planning"
  | "hotels"
  | "attractions"
  | "video"
  | "podcast"
  | "official"
  | "community"
  | "social"
  | "international";
export type SourceType = "rssArticle" | "youtubeChannel" | "podcastRSS" | "redditFeed";
export type TrustLabel = "official" | "verifiedNews" | "communitySource";
export type VideoOpenMode = "inAppBrowser" | "safari" | "youtubeApp";

export interface Checkpoint {
  id: string;
  anchorItemID: string;
  anchorPublishedAt: string;
  setAt: string;
}

export interface DownloadRecord {
  id: string;
  feedItemID: string;
  localFileURL: string;
  downloadedAt: string;
  fileSizeBytes: number;
  isComplete: boolean;
}

export interface PlaybackProgress {
  feedItemID: string;
  positionSeconds: number;
  durationSeconds: number;
  lastPlayedAt: string;
  isCompleted: boolean;
}

export interface PlaybackQueueItem {
  id: string;
  feedItemID: string;
  sortIndex: number;
  addedAt: string;
}

export interface FeedItem {
  id: string;
  sourceID: string;
  sourceType: SourceType;
  contentType: ContentType;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  canonicalURL: string;
  externalURL?: string | null;
  publishedAt: string;
  authorOrChannel?: string | null;
  durationSeconds?: number | null;
  artworkURL?: string | null;
  thumbnailURL?: string | null;
  isSaved: boolean;
  isRead: boolean;
  isNewRelativeToCheckpoint: boolean;
  groupID?: string | null;
  mediaPlaybackState?: PlaybackProgress | null;
  isDownloaded: boolean;
  downloadState: DownloadState;
  rawContentHash?: string | null;
  trustLabel?: TrustLabel | null;
  tags: string[];
}

export interface Source {
  id: string;
  name: string;
  sourceType: SourceType;
  feedURL: string;
  homepageURL?: string | null;
  trustLabel: TrustLabel;
  categoryTags: SourceCategory[];
  isEnabled: boolean;
  isDefaultEnabled: boolean;
  isCustom: boolean;
  isRecommended: boolean;
  description?: string | null;
  artworkURL?: string | null;
  lastRefreshAt?: string | null;
  lastRefreshSucceeded?: boolean | null;
  lastErrorMessage?: string | null;
}

export interface StoryGroup {
  id: string;
  primaryItemID: string;
  memberItemIDs: string[];
  headline: string;
  sourceCount: number;
  contentTypes: ContentType[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  sortOrder: SortOrder;
  defaultSmartView: SmartView;
  previewLength: number;
  showThumbnails: boolean;
  showArtwork: boolean;
  retentionWindowDays: number;
  openArticlesIn: ArticleOpenMode;
  openVideosIn: VideoOpenMode;
  preferReaderMode: boolean;
  autoRefreshOnLaunch: boolean;
  showOnlyNew: boolean;
  groupStoriesEnabled: boolean;
  playbackDefaultSpeed: number;
  skipIntervalSeconds: number;
  autoPlayNextEpisode: boolean;
  preferStreamingOverDownload: boolean;
  offlineSavingEnabled: boolean;
  cacheWindowDays: number;
  maxCachedItems: number;
  quietHoursEnabled: boolean;
  breakingNewsEnabled: boolean;
  dailyDigestEnabled: boolean;
  colorTheme: ColorTheme;
  lowVisionEnhancedSpacing: boolean;
  lowVisionBoldMetadata: boolean;
  highVisualContrastMode: boolean;
  hideThumbnailsForLowVision: boolean;
  simplifiedLayoutEnabled: boolean;
  timelineDisplayMode: "full" | "minimal";
  timelineContentFilter: "all" | ContentType | "social";
  parkFilter: ParkFilterKey;
}

export interface SourceMeta {
  etag?: string;
  lastModified?: string;
  rawHash?: string;
  failureCount?: number;
  nextRetryAt?: string;
}

export interface RefreshResult {
  items: FeedItem[];
  groups: StoryGroup[];
  fetchedSourceCount: number;
  fetchedItemCount: number;
  failures: { sourceID: string; message: string }[];
  updatedSourceMeta: Record<string, SourceMeta>;
}

export const defaultUserSettings: UserSettings = {
  sortOrder: "newestFirst",
  defaultSmartView: "all",
  previewLength: 3,
  showThumbnails: true,
  showArtwork: true,
  retentionWindowDays: 14,
  openArticlesIn: "inAppBrowser",
  openVideosIn: "youtubeApp",
  preferReaderMode: true,
  autoRefreshOnLaunch: true,
  showOnlyNew: false,
  groupStoriesEnabled: true,
  playbackDefaultSpeed: 1.0,
  skipIntervalSeconds: 30,
  autoPlayNextEpisode: true,
  preferStreamingOverDownload: true,
  offlineSavingEnabled: true,
  cacheWindowDays: 30,
  maxCachedItems: 500,
  quietHoursEnabled: false,
  breakingNewsEnabled: true,
  dailyDigestEnabled: true,
  colorTheme: "system",
  lowVisionEnhancedSpacing: false,
  lowVisionBoldMetadata: false,
  highVisualContrastMode: false,
  hideThumbnailsForLowVision: false,
  simplifiedLayoutEnabled: false,
  timelineDisplayMode: "full",
  timelineContentFilter: "all",
  parkFilter: "all",
};
