// Phase 18 — Destination Profiles

export type DestinationType = "theme_park" | "water_park" | "resort" | "cruise_line" | "disney_plus";

export interface DestinationProfile {
  id: string;
  name: string;
  type: DestinationType;
  resortId: string;
  parkTagKey?: string;
  shortDescription: string;
  openedYear?: number;
  themeDescription?: string;
  entityNames: string[];   // entity names that match this destination in the graph
  accessibilityLabel: string;
}

export interface DestinationProfileResult {
  profile: DestinationProfile;
  clusterCount: number;
  recentClusterIds: string[];
  relatedEntityNames: string[];
}
