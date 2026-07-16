// Phase 15 — Analytics thresholds and park coverage definitions

// A source is "silent" if it has published nothing in this many hours
export const SILENT_SOURCE_HOURS = 48;
// A source is "slow" if its 24h count is below this (but not zero)
export const SLOW_SOURCE_THRESHOLD = 1;
// A source is "failing" if its last refresh failed
// (status "failing" overrides "slow" or "silent")

export const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
export const WINDOW_7D_MS = 7 * 24 * 60 * 60 * 1000;

// Parks and locations to check for coverage gaps
export const COVERAGE_LOCATIONS: { id: string; label: string }[] = [
  { id: "magic_kingdom", label: "Magic Kingdom" },
  { id: "epcot", label: "EPCOT" },
  { id: "hollywood_studios", label: "Hollywood Studios" },
  { id: "animal_kingdom", label: "Animal Kingdom" },
  { id: "disneyland", label: "Disneyland" },
  { id: "california_adventure", label: "California Adventure" },
  { id: "disneyland_paris", label: "Disneyland Paris" },
  { id: "disney_cruise_line", label: "Disney Cruise Line" },
];

// Top sources list length shown in the dashboard
export const TOP_SOURCES_LIMIT = 10;
