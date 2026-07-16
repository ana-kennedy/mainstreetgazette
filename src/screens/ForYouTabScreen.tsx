import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import type { ForYouStackParamList } from "../navigation/types";
import { ForYouScreenCore } from "./ForYouScreen";

type Props = NativeStackScreenProps<ForYouStackParamList, "ForYouHome">;

export function ForYouTabScreen({ navigation }: Props) {
  return (
    <ForYouScreenCore
      onNavigateToDetail={(item) => navigation.navigate("SavedDetail", { item })}
      onNavigateToStoryDetail={(clusterId) => navigation.navigate("StoryDetail", { clusterId })}
      onNavigateToPlayer={() => navigation.navigate("Player")}
      onOpenLibrary={() => navigation.navigate("GazetteLibrary")}
      onOpenTripCompanion={() => navigation.navigate("TripCompanion")}
      onOpenPreferences={() => navigation.getParent()?.navigate("Preferences" as never)}
    />
  );
}
