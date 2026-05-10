import type { FeedItem, Source } from "../domain/models";

export type NewsStackParamList = {
  NewsHome: undefined;
  FeedDetail: { item: FeedItem };
  Player: undefined;
};

export type SavedStackParamList = {
  SavedHome: undefined;
  SavedDetail: { item: FeedItem };
};

export type SourcesStackParamList = {
  SourcesHome: undefined;
  SourceFeed: { source: Source };
  SourceManage: undefined;
  FeedDetail: { item: FeedItem };
  Player: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
};

export type RootTabParamList = {
  News: undefined;
  Parks: undefined;
  Saved: undefined;
  Sources: undefined;
  Settings: undefined;
};
