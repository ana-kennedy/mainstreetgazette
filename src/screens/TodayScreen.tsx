import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import type { TodayStackParamList } from "../navigation/types";
import { NewsScreenCore } from "./NewsScreen";

type Props = NativeStackScreenProps<TodayStackParamList, "TodayHome">;

export function TodayScreen({ navigation }: Props) {
  return (
    <NewsScreenCore
      mode="today"
      onNavigateToDetail={(item) => navigation.navigate("FeedDetail", { item })}
      onNavigateToPlayer={() => navigation.navigate("Player")}
    />
  );
}
