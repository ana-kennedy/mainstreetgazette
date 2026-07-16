// Phase 17 — Explore Hub types
// Aggregates outputs from Phases 11 (Trending), 12 (Accessibility), 13 (Events), 16 (Graph)
// into a single surface for the Explore tab.

export type ExploreSectionId =
  | "breaking"
  | "active_events"
  | "trending_entities"
  | "accessibility"
  | "collections";

export interface ExploreStatChip {
  id: string;
  label: string;
  count: number;
  icon: string;
  accessibilityLabel: string;
}

export interface ExploreEntitySpotlight {
  entityName: string;
  clusterCount: number;
  parkIds: string[];
  accessibilityLabel: string;
}

export interface ExploreHub {
  stats: ExploreStatChip[];
  trendingEntities: ExploreEntitySpotlight[];
  breakingClusterIds: string[];
  activeEventIds: string[];
  hasAccessibilityNews: boolean;
  computedAt: number;
}
