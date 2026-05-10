import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import type { NewsStackParamList } from "../navigation/types";
import { NewsScreenCore } from "./NewsScreen";

type Props = NativeStackScreenProps<NewsStackParamList, "NewsHome">;

export function NewsTabScreen({ navigation }: Props) {
  return (
    <NewsScreenCore
      mode="allUnread"
      onNavigateToDetail={(item) => navigation.navigate("FeedDetail", { item })}
      onNavigateToPlayer={() => navigation.navigate("Player")}
    />
  );
}
