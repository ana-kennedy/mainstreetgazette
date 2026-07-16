import type { FeedItem, Source } from "../domain/models";

export type NewsStackParamList = {
  NewsHome: undefined;
  FeedDetail: { item: FeedItem };
  StoryDetail: { clusterId: string };
  EntityProfile: { entityName: string };
  Player: undefined;
};

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  FeedDetail: { item: FeedItem };
  StoryDetail: { clusterId: string };
  CollectionDetail: { collectionId: string };
  EntityProfile: { entityName: string };
  ParksHome: { initialView?: "hub" | "destinations"; initialResortId?: string } | undefined;
  EntityGraph: undefined;
  SourcesHome: undefined;
  SourceFeed: { source: Source };
  SourceManage: undefined;
  Player: undefined;
};

export type ForYouStackParamList = {
  ForYouHome: undefined;
  GazetteLibrary: undefined;
  TripCompanion: undefined;
  SavedDetail: { item: FeedItem };
  FeedDetail: { item: FeedItem };
  StoryDetail: { clusterId: string };
  CollectionDetail: { collectionId: string };
  EntityProfile: { entityName: string };
  SourceManage: undefined;
  Player: undefined;
};

// Kept for SavedScreen (retired) and FeedDetailScreen prop types
export type SavedStackParamList = {
  SavedHome: undefined;
  SavedDetail: { item: FeedItem };
};

// Kept for SourcesScreen, SourceFeedScreen, SourceManageScreen prop types
export type SourcesStackParamList = {
  SourcesHome: undefined;
  SourceFeed: { source: Source };
  SourceManage: undefined;
  FeedDetail: { item: FeedItem };
  Player: undefined;
};

// Kept for ParksScreen/EntityGraphScreen prop types — now hosted inside DiscoverStack
export type ParksStackParamList = {
  ParksHome: { initialView?: "hub" | "destinations"; initialResortId?: string } | undefined;
  EntityGraph: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  // Your Experience
  MyMagic: undefined;
  GazetteAlerts: undefined;
  ReadingExperience: undefined;
  AccessibilityPreferences: undefined;
  // Gazette Library
  GazetteLibrarySettings: undefined;
  // Explore Disney
  ExploreDisneyPreferences: undefined;
  // About the Gazette
  AboutGazette: undefined;
  // Hidden developer area (reached only via the unlock in AboutGazetteScreen)
  DeveloperTools: undefined;
  Analytics: undefined;
  SourceLibrary: undefined;
  SourceFeed: { source: Source };
  SourceManage: undefined;
  FeedDetail: { item: FeedItem };
  SourcePlayer: undefined;
  // Reachable via the News tab's own gear icon, not from Settings home directly
  NewsPreferences: undefined;
  // Help & Support
  UserGuide: { section?: import("../data/helpContent").HelpSection } | undefined;
  WhatsNew: undefined;
  AccessibilityGuide: { section?: "voiceover" | "lowVision" | "braille" | "faq" } | undefined;
};

// Preferences remains a real tab route (reachable via navigation.getParent()?.navigate("Preferences")
// from any screen) but is hidden from the visible tab bar in favor of a gear icon on each tab.
export type RootTabParamList = {
  News: undefined;
  Discover: undefined;
  ForYou: undefined;
  Preferences: undefined;
};
