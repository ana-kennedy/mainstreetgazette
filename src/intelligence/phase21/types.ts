// Phase 21 — Entertainment Hub

export type EntertainmentType =
  | "parade"
  | "fireworks"
  | "show"
  | "character_meet"
  | "seasonal_spectacular"
  | "live_entertainment";

export interface EntertainmentCluster {
  clusterId: string;
  headline: string;
  publishedAt: string;
  sourceCount: number;
  isOfficial: boolean;
  isBreaking: boolean;
  entertainmentType: EntertainmentType;
  entertainmentEntityName?: string;
  accessibilityLabel: string;
}

export interface ParkEntertainmentHub {
  parkTagKey: string;
  clusters: EntertainmentCluster[];
  hasSpectacular: boolean;
  computedAt: number;
}
