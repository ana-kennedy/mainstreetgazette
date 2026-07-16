import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import type { DiscoverStackParamList } from "../navigation/types";
import { DiscoverScreenCore } from "./DiscoverScreen";

type Props = NativeStackScreenProps<DiscoverStackParamList, "DiscoverHome">;

export function DiscoverTabScreen({ navigation }: Props) {
  return (
    <DiscoverScreenCore
      onNavigateToDetail={(item) => navigation.navigate("FeedDetail", { item })}
      onNavigateToStoryDetail={(clusterId) => navigation.navigate("StoryDetail", { clusterId })}
      onNavigateToCollectionDetail={(collectionId) => navigation.navigate("CollectionDetail", { collectionId })}
      onNavigateToParks={(params) => navigation.navigate("ParksHome", params)}
      onOpenPreferences={() => navigation.getParent()?.navigate("Preferences" as never)}
    />
  );
}
