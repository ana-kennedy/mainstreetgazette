import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import type { AllUnreadStackParamList } from "../navigation/types";
import { NewsScreenCore } from "./NewsScreen";

type Props = NativeStackScreenProps<AllUnreadStackParamList, "AllUnreadHome">;

export function AllUnreadScreen({ navigation }: Props) {
  return (
    <NewsScreenCore
      mode="allUnread"
      onNavigateToDetail={(item) => navigation.navigate("FeedDetail", { item })}
      onNavigateToPlayer={() => navigation.navigate("Player")}
    />
  );
}
