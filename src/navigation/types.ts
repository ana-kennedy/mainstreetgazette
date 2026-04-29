import type { FeedItem } from "../domain/models";

export type NewsStackParamList = {
  NewsHome: undefined;
  FeedDetail: { item: FeedItem };
  Player: undefined;
};

export type SavedStackParamList = {
  SavedHome: undefined;
  SavedDetail: { item: FeedItem };
};

export type RootTabParamList = {
  News: undefined;
  Saved: undefined;
  Sources: undefined;
  Settings: undefined;
};
