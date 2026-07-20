import type { ReaderDocument, ReaderStatus } from "../types/readerTypes";

export type AnnouncementLevel = "simple" | "normal" | "all";
// Phase 07: "standard" replaces the old "comfortable" value (see storage.ts's
// loadSettings migration) and "spacious" is new.
export type CardDensity = "standard" | "spacious" | "compact";
export type ArtworkDensity = "full" | "reduced" | "textFirst";
export type ArticleOpenMode = "inAppBrowser" | "safari";
export type ColorTheme = "light" | "dark" | "gazette" | "midnight" | "fantasy" | "system";
export type ContentType = "article" | "video" | "podcast" | "community";
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
export type PlatformKey = "rss" | "youtube" | "podcast" | "reddit" | "forum" | "x" | "bluesky" | "facebook" | "instagram" | "threads" | "tiktok";
export type OfficialStatus = "Official" | "Unofficial" | "Community";
export type DisneyEntityType =
  | "resort"
  | "park_or_district"
  | "attraction"
  | "attraction_or_land"
  | "resort_hotel"
  | "event_or_festival"
  | "cruise_ship"
  | "cruise_destination"
  | "travel_product";
export type LocationFilterKey = "all" | "wdw" | "dlr" | "dcl" | "international";
export type TimelineWindow = "all" | "now" | "today" | "last_3_days" | "week" | "month";
export type SourceType = "rssArticle" | "youtubeChannel" | "podcastRSS" | "redditFeed";
export type TrustLabel = "official" | "verifiedNews" | "communitySource";
export type VideoOpenMode = "inAppBrowser" | "safari" | "youtubeApp";
export type ContentTier = "fresh" | "remembered" | "archived";
export type ExploreOpeningView = "liveToday" | "todaysGazette" | "planning" | "parkRadio" | "rememberLast";
export type WeatherUnitPreference = "auto" | "fahrenheit" | "celsius";
export type IngestionMode = "live" | "backfill" | "booster" | "migration";

export interface DisneyKnowledgeEntity {
  id: string;
  name: string;
  type: DisneyEntityType | string;
  locationId: string;
  parkId?: string | null;
  land?: string | null;
  aliases: string[];
  keywords: string[];
  confidenceBoost: "low" | "normal" | "high" | string;
  activeStatus: "active" | "seasonal" | "announced" | "retired" | string;
  notes?: string;
}

export interface TopicTaxonomyItem {
  id: string;
  name: string;
  keywords: string[];
}

export interface EntityMatch {
  entityId: string;
  entityName: string;
  score: number;
  matchedKeywords: string[];
  locationId: string;
  parkId?: string | null;
}

export interface TopicMatch {
  topicId: string;
  topicName: string;
  score: number;
}

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
  firstDiscoveredAt?: string;
  lastUpdatedAt?: string;
  ingestionMode?: IngestionMode;
  editionEligible?: boolean;
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
  feedSummary?: string | null;
  readerText?: string | null;
  readerContent?: ReaderDocument | null;
  readerStatus?: ReaderStatus;
  readerFetchedAt?: string | null;
  readerFailureReason?: string | null;
  readerWordCount?: number | null;
  trustLabel?: TrustLabel | null;
  tags: string[];
  // Phase 2: Disney knowledge enrichment
  entityMatches?: EntityMatch[];
  topicMatches?: TopicMatch[];
  primaryLocationId?: string;
  primaryParkId?: string;
  storyFingerprint?: string;
  // Phase 4: AI classification
  classification?: import("../types/classificationTypes").ClassificationResult;
  // Phase 06: Living Gazette Library storage tier. Undefined is treated as "fresh"
  // (covers items ingested before this field existed).
  contentTier?: ContentTier;
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
  // Catalog enrichment fields
  legacyId?: string;
  sourceRecordId?: string;
  publisherType?: string;
  officialStatus?: OfficialStatus;
  coverageAreas?: string[];
  trustPriority?: number;
}

export interface SourceRecord {
  sourceId: string;
  displayName: string;
  publisherType: string;
  officialStatus: OfficialStatus;
  websiteUrl?: string | null;
  primaryContentType: ContentType;
  defaultEnabled: boolean;
  trustPriority: number;
  coverageAreas: string[];
  contentCategories: string[];
  platforms: Partial<Record<PlatformKey, string | null>>;
  canonicalPlatform: string;
  includedPlatforms: string[];
  ignoredPlatforms: string[];
  deduplicationRule: string;
  timelineBehavior?: string;
  notes?: string | null;
  verificationStatus?: string;
}

export interface SourceCatalog {
  version: string;
  generatedAt?: string;
  app?: string;
  sources: SourceRecord[];
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
  displayName?: string;
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
  showSinceLastVisit: boolean;
  groupStoriesEnabled: boolean;
  playbackDefaultSpeed: number;
  skipIntervalSeconds: number;
  autoPlayNextEpisode: boolean;
  preferStreamingOverDownload: boolean;
  cacheWindowDays: number;
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
  locationFilter: LocationFilterKey;
  sourceFilter: string | null;
  timelineWindow: TimelineWindow;
  announcementLevel: AnnouncementLevel;
  soundEffectsEnabled: boolean;
  hapticsEnabled: boolean;
  newArticlesSummaryEnabled: boolean;
  iCloudSyncEnabled: boolean;
  iCloudSyncSavedArticles: boolean;
  iCloudSyncSources: boolean;
  iCloudSyncSettings: boolean;
  iCloudSyncPlayback: boolean;
  aiSummariesEnabled: boolean;
  translateArticlesEnabled: boolean;
  cardDensity: CardDensity;
  // Phase 06: Living Gazette Library. "Optimize Automatically" (default) lets older,
  // unsaved items shed images/body text and eventually shrink to a minimal searchable
  // record; "Keep Everything Available" disables all of that. Saved items are never
  // touched either way.
  optimizeStorageAutomatically: boolean;
  // Only grow the Library (adaptive background backfill) on Wi-Fi. Baseline "fetch the
  // latest" refresh is unaffected — this only gates the extra backfill batches.
  growLibraryWifiOnly: boolean;
  // Phase 07: Reading Experience.
  artworkDensity: ArtworkDensity;
  // Phase 07: Explore Disney. (Park Radio has no real settings here — the feature
  // doesn't exist yet, see ExploreDisneyPreferencesScreen — a "coming soon" row isn't
  // backed by a stored setting, to avoid a dead toggle that controls nothing.)
  exploreOpeningView: ExploreOpeningView;
  weatherUnit: WeatherUnitPreference;
  // Phase 08: Gazette Alerts' four named choices. breakingNewsEnabled/dailyDigestEnabled
  // (above) back "Special Editions"/"Morning Edition" — these two are new.
  disneyMomentsEnabled: boolean;
  tripCompanionAlertsEnabled: boolean;
}

export interface SourceMeta {
  etag?: string;
  lastModified?: string;
  rawHash?: string;
  failureCount?: number;
  nextRetryAt?: string;
  lastFetchedAt?: string;
  lastFetchedItemCount?: number;
  // Phase 06: how deep into this source's own available feed window we've ingested
  // so far. Resumable across app runs; raised gradually by adaptive background
  // backfill batches, never by interactive/manual refresh.
  backfillCursorCount?: number;
  lastBackfillBatchAt?: string;
}

// Phase 08 — Trip Companion. Lives primarily in the For You tab; Settings only has a
// management link (ExploreDisneyPreferencesScreen). Supports multiple upcoming trips.
export interface Trip {
  id: string;
  destinationId: string;
  startDate: string; // ISO date (yyyy-mm-dd)
  endDate: string; // ISO date (yyyy-mm-dd)
  resort?: string;
  notes?: string;
  // Only set with explicit user consent (see TripCompanionScreen) — references an
  // existing editorial/automatic collection id (savedCollectionIDs-style), since this
  // app has no user-authored-collection model to link to instead (see PHASE_05_RESULTS.md).
  linkedCollectionId?: string;
  createdAt: string;
}

export interface RefreshResult {
  items: FeedItem[];
  groups: StoryGroup[];
  fetchedSourceCount: number;
  fetchedItemCount: number;
  failures: { sourceID: string; message: string }[];
  updatedSourceMeta: Record<string, SourceMeta>;
  gapWarnings: { sourceId: string; sourceName: string }[];
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
  showSinceLastVisit: false,
  groupStoriesEnabled: true,
  playbackDefaultSpeed: 1.0,
  skipIntervalSeconds: 30,
  autoPlayNextEpisode: true,
  preferStreamingOverDownload: true,
  cacheWindowDays: 90,
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
  locationFilter: "all",
  sourceFilter: null,
  timelineWindow: "all",
  announcementLevel: "all",
  soundEffectsEnabled: true,
  hapticsEnabled: true,
  newArticlesSummaryEnabled: true,
  iCloudSyncEnabled: false,
  iCloudSyncSavedArticles: true,
  iCloudSyncSources: true,
  iCloudSyncSettings: true,
  iCloudSyncPlayback: false,
  aiSummariesEnabled: true,
  translateArticlesEnabled: true,
  cardDensity: "standard",
  optimizeStorageAutomatically: true,
  growLibraryWifiOnly: true,
  artworkDensity: "full",
  exploreOpeningView: "liveToday",
  weatherUnit: "auto",
  disneyMomentsEnabled: false,
  tripCompanionAlertsEnabled: true,
};
