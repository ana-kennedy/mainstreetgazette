// Phase 11 — Trending Engine scoring weights
// Matches the handoff's trending-score-weights.json

export const TRENDING_WEIGHTS = {
  // Per-item velocity score: each new item published in the last 24h adds this
  recentStoryVelocity: 35,
  // Per trusted source covering the story (capped at MAX_SOURCE_BONUS)
  trustedSourceCount: 25,
  // Per community/discussion item (capped at MAX_COMMUNITY_BONUS)
  communityDiscussionVolume: 20,
  // Flat boost when story touches a user favorite
  favoriteUserMatch: 15,
  // Flat boost for official Disney source
  officialSourceBoost: 20,
  // Penalty per detected social repost duplicate (applies to communityCount heuristic)
  duplicatePenalty: -20,
} as const;

// Cap bonuses so a single giant cluster doesn't dominate
export const MAX_VELOCITY_BONUS = 140;       // 35 * 4 items max velocity contribution
export const MAX_SOURCE_BONUS = 100;         // 25 * 4 sources max
export const MAX_COMMUNITY_BONUS = 60;       // 20 * 3 community items max

// Windows for velocity measurement
export const VELOCITY_WINDOW_24H_MS = 24 * 60 * 60 * 1000;
export const VELOCITY_WINDOW_6H_MS = 6 * 60 * 60 * 1000;

// How many results to include per output section
export const TRENDING_STORY_LIMIT = 10;
export const FASTEST_GROWING_LIMIT = 5;
export const TRENDING_TOPIC_LIMIT = 8;
export const TRENDING_MEDIA_LIMIT = 5;
export const SOURCE_VELOCITY_LIMIT = 5;

// Minimum trending score before a story surfaces in the trending feed
export const MIN_TRENDING_SCORE = 20;
