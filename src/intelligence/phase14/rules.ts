// Phase 14 — Media Hub scoring rules

// Score bonuses for ranking media items
export const MEDIA_SCORE_WEIGHTS = {
  officialSource: 40,
  hasThumbnail: 10,
  hasArtwork: 8,
  linkedToCluster: 12,
  clusterIsOfficial: 15,
  clusterIsBreaking: 10,
  freshnessBonus24h: 20,
  freshnessBonus72h: 10,
  highImportanceCluster: 8,
} as const;

// Age windows for freshness bonuses
export const MEDIA_WINDOW_24H_MS = 24 * 60 * 60 * 1000;
export const MEDIA_WINDOW_72H_MS = 72 * 60 * 60 * 1000;

// How many items to include per section
export const VIDEO_LIMIT = 10;
export const PODCAST_LIMIT = 10;
export const OFFICIAL_VIDEO_LIMIT = 5;
export const FEATURED_SHELF_LIMIT = 8; // combined videos+podcasts shown in the shelf
