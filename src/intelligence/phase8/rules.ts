// Phase 8 — Discovery Engine scoring constants and configuration

export const DISCOVERY_SCORES = {
  favoriteEntity: 40,
  favoritePark: 35,
  favoriteTopic: 25,
  favoriteSource: 30,
  officialBoost: 15,
  breakingBoost: 20,
  freshnessBoost24h: 10,
  freshnessBoost72h: 5,
  importanceBoostPerPoint: 0.3,
};

export const DISCOVERY_SECTION_LIMITS = {
  becauseYouFollow: 12,
  newFromFavoriteSources: 8,
  trendingNearInterests: 8,
  recommendedVideos: 8,
  recommendedPodcasts: 8,
};

// Social platforms whose posts are lower-priority when the article already exists
export const SOCIAL_PLATFORM_TYPES = new Set([
  "x", "threads", "instagram", "facebook", "bluesky",
]);

// Display-friendly park names keyed by ParkFilterKey
export const PARK_DISPLAY_NAMES: Record<string, string> = {
  magic_kingdom: "Magic Kingdom",
  epcot: "EPCOT",
  hollywood_studios: "Hollywood Studios",
  animal_kingdom: "Animal Kingdom",
  disneyland: "Disneyland",
  california_adventure: "California Adventure",
  disneyland_paris: "Disneyland Paris",
  walt_disney_studios_paris: "Walt Disney Studios Paris",
  tokyo_disneyland: "Tokyo Disneyland",
  tokyo_disneysea: "Tokyo DisneySea",
  shanghai_disneyland: "Shanghai Disneyland",
  hong_kong_disneyland: "Hong Kong Disneyland",
};
