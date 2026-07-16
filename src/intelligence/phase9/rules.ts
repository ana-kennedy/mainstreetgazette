// Phase 9 — Notification Intelligence scoring constants
// Mirrors the priority-rules.json from the handoff package

export const NOTIFICATION_SCORES = {
  officialMajorAnnouncement: 100,
  favoriteEntityUpdate: 85,
  breakingMultiSource: 80,
  favoriteParkUpdate: 75,
  highImportance: 70,
  favoriteTopic: 60,
  preferredSource: 55,
  digestCandidate: 40,
  routineDuplicate: 10,
};

// Minimum importance scores per notification profile (mirrors Phase 7 notificationSelector)
export const MIN_IMPORTANCE_BY_PROFILE: Record<string, number> = {
  quiet: 85,
  balanced: 70,
  breaking_heavy: 55,
};

// A cluster with breakingScore ≥ this threshold is treated as breaking news
export const BREAKING_SCORE_THRESHOLD = 70;

// Minimum importance for entity-watch and park-alert notifications
export const WATCH_IMPORTANCE_MIN = 50;

// Digest accumulates stories below this score when dailyDigestEnabled
export const DIGEST_SCORE_CEILING = 65;

// Max stories summarised in a digest notification body
export const DIGEST_MAX_HEADLINES = 5;

// Default quiet hours window: 10pm – 7am local time
export const QUIET_HOURS_START = 22;
export const QUIET_HOURS_END = 7;

// Phase 08 — topics that qualify a "standard" (non-breaking, non-official) cluster as
// a gentle "Disney Moment" rather than routine news. Matches the interest ids added to
// topic_taxonomy_v1.json in Phase 07.
export const DISNEY_MOMENT_TOPICS = ["disney_history", "festivals_seasonal", "community_highlights"];
