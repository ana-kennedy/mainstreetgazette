// Phase 16 — Disney Graph Engine rules

import type { GraphRelationshipType } from "./types";

// Human-readable labels for each relationship type
export const RELATIONSHIP_LABELS: Record<GraphRelationshipType, string> = {
  located_in: "Located In",
  part_of: "Part Of",
  near: "Near",
  replaced_by: "Replaced By",
  related_to: "Related To",
  mentions: "Mentioned In",
  covered_by: "Covered By",
  same_story_as: "Same Story",
};

// Minimum co-mention weight before an edge appears as a "related entity"
export const MIN_EDGE_WEIGHT = 2;

// How many clusters to surface on an EntityProfile recent coverage section
export const ENTITY_PROFILE_CLUSTER_LIMIT = 8;

// Max related entities to show on a profile page
export const RELATED_ENTITIES_LIMIT = 6;

// Park display names (mirrors Phase 8 rules for consistency)
export const PARK_DISPLAY_NAMES: Record<string, string> = {
  magic_kingdom: "Magic Kingdom",
  epcot: "EPCOT",
  hollywood_studios: "Hollywood Studios",
  animal_kingdom: "Animal Kingdom",
  disneyland: "Disneyland",
  california_adventure: "California Adventure",
  disneyland_paris: "Disneyland Paris",
  walt_disney_studios_paris: "Walt Disney World Studios Paris",
  tokyo_disneyland: "Tokyo Disneyland",
  tokyo_disneysea: "Tokyo DisneySea",
  shanghai_disneyland: "Shanghai Disneyland",
  hong_kong_disneyland: "Hong Kong Disneyland",
  disney_cruise_line: "Disney Cruise Line",
};
