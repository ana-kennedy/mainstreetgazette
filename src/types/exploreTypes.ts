export type DestinationType =
  | "resort"
  | "theme_park"
  | "district"
  | "water_park"
  | "cruise_line"
  | "cruise_ship"
  | "cruise_port"
  | "private_destination"
  | "entertainment";

export interface ExploreDestination {
  id: string;
  type: DestinationType;
  name: string;
  parentId?: string;
  tagKeys: string[];
  weatherLocationId?: string;
  waitTimeProviderId?: string;
  description?: string;
}

export type DestinationSectionState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "available"; data: T; updatedAt: string; sourceLabel: string }
  | { status: "empty"; message: string }
  | { status: "stale"; data: T; updatedAt: string; sourceLabel: string }
  | { status: "error"; message: string };
