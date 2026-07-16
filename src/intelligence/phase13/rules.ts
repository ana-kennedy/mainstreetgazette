// Phase 13 — Event Calendar detection rules and keyword lists

import type { EventType } from "./types";

// Keywords used to detect events from StoryCluster titles/topics/entities
export const EVENT_TYPE_KEYWORDS: Record<EventType, string[]> = {
  festival: [
    "festival",
    "EPCOT International Food",
    "EPCOT International Flower",
    "EPCOT International Festival",
    "Garden & Garden Festival",
    "Festival of the Holidays",
    "Festival of the Arts",
    "Taste of EPCOT",
    "Harvest Festival",
  ],
  ticketed_party: [
    "Mickey's Not-So-Scary",
    "Mickey's Very Merry",
    "MNSSHP",
    "MVMCP",
    "After Hours",
    "Boo Bash",
    "Very Merriest",
    "ticketed party",
    "special ticketed",
    "party ticket",
  ],
  refurbishment: [
    "refurbishment",
    "refurb",
    "closure",
    "closing for",
    "temporarily closed",
    "renovation",
    "maintenance closure",
    "reopening",
  ],
  cruise_sailing: [
    "Disney Cruise",
    "DCL",
    "Disney Wish",
    "Disney Dream",
    "Disney Fantasy",
    "Disney Magic",
    "Disney Wonder",
    "Disney Treasure",
    "sailing",
    "cruise itinerary",
  ],
  movie_release: [
    "in theaters",
    "theatrical release",
    "opens in theaters",
    "movie release",
    "film release",
    "box office",
    "opening weekend",
  ],
  disney_plus_release: [
    "Disney+",
    "streaming",
    "premieres on Disney",
    "Disney Plus",
    "series premiere",
    "drops on Disney",
    "new on Disney+",
  ],
  rundisney: [
    "runDisney",
    "Walt Disney World Marathon",
    "Disneyland Half Marathon",
    "Princess Half Marathon",
    "Star Wars Rival Run",
    "Wine & Dine Half",
    "Springtime Surprise",
    "race weekend",
  ],
};

// How many days until end before an active event is flagged "ending_soon"
export const ENDING_SOON_DAYS = 7;

// How many days ahead to include in the upcoming list
export const UPCOMING_HORIZON_DAYS = 90;

// Maximum events to show per section in the UI
export const ACTIVE_EVENTS_LIMIT = 5;
export const ENDING_SOON_LIMIT = 3;
export const UPCOMING_EVENTS_LIMIT = 8;

// Display labels for event types
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  festival: "Festival",
  ticketed_party: "Party",
  refurbishment: "Refurb",
  cruise_sailing: "Cruise",
  movie_release: "In Theaters",
  disney_plus_release: "Disney+",
  rundisney: "runDisney",
};
