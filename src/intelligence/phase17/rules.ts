// Phase 17 — Explore Hub rules

export const BREAKING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h
export const ACTIVE_EVENT_WINDOW_MS = 0; // "active" means startDate <= now <= endDate
export const TRENDING_ENTITY_LIMIT = 5;
export const MIN_ENTITY_CLUSTER_COUNT = 2; // need ≥2 clusters to surface an entity
export const EXPLORE_STAT_ICONS: Record<string, string> = {
  breaking: "alert-circle",
  active_events: "calendar-check",
  trending_entities: "trending-up",
  accessibility: "human",
};
