// Phase 12 — Accessibility Intelligence scoring rules and keyword lists
// Keyword lists sourced from data/accessibility-keywords.json

import type { AccessibilityCategory } from "./types";

export const ACCESSIBILITY_KEYWORDS: Record<AccessibilityCategory, string[]> = {
  das: [
    "DAS",
    "Disability Access Service",
    "return time",
    "accessibility service",
    "accessibility pass",
    "disability pass",
    "accessible queue",
    "IBCCES",
    "advanced DAS",
    "DAS pre-selection",
    "cognitive disability",
  ],
  blind_low_vision: [
    "blind",
    "low vision",
    "screen reader",
    "VoiceOver",
    "audio description",
    "braille",
    "magnification",
    "visual impairment",
    "assistive technology",
    "AppleVis",
    "TalkBack",
  ],
  mobility: [
    "wheelchair",
    "ECV",
    "mobility",
    "accessible entrance",
    "accessible seating",
    "companion restroom",
    "mobility device",
    "transfer",
    "accessible parking",
    "mobility impairment",
    "adaptive stroller",
  ],
  service_animals: [
    "service animal",
    "guide dog",
    "relief area",
    "service dog",
    "assistance animal",
    "animal relief",
  ],
  captions: [
    "captioning",
    "closed captions",
    "assistive listening",
    "hearing loop",
    "sign language",
    "ASL",
    "hard of hearing",
    "deaf",
    "hearing impairment",
    "captioned",
    "subtitles",
  ],
};

// Base score per matched category (DAS scores highest — most users actively track updates)
export const CATEGORY_BASE_SCORES: Record<AccessibilityCategory, number> = {
  das: 50,
  blind_low_vision: 35,
  mobility: 30,
  service_animals: 25,
  captions: 25,
};

// Bonuses applied on top of base category score
export const ACCESSIBILITY_SCORE_BONUSES = {
  breaking: 20,
  official: 15,
  multiSource: 10,
  multiCategory: 8,
  recency24h: 12,
  recency72h: 6,
};

// How many stories to include in the hub
export const ACCESSIBILITY_HUB_LIMIT = 8;
// How many DAS updates to surface separately
export const DAS_UPDATES_LIMIT = 3;
// Minimum score before a cluster enters the hub
export const MIN_ACCESSIBILITY_SCORE = 20;

export const VELOCITY_WINDOW_24H_MS = 24 * 60 * 60 * 1000;
export const VELOCITY_WINDOW_72H_MS = 72 * 60 * 60 * 1000;
