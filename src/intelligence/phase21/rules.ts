// Phase 21 — Entertainment Hub rules
import type { EntertainmentType } from "./types";

export const ENTERTAINMENT_TYPE_KEYWORDS: Record<EntertainmentType, string[]> = {
  fireworks: ["firework", "fireworks", "nighttime spectacular", "pyrotechnic", "epcot forever", "happily ever after", "fantasy in the sky", "fantasmic", "world of color"],
  parade: ["parade", "cavalcade", "festival of fantasy", "main street electrical parade", "paint the night"],
  seasonal_spectacular: ["halloween party", "christmas party", "mnsshp", "mvmcp", "boo bash", "jollywood"],
  show: ["show", "stage", "live performance", "revue", "indiana jones", "beauty and the beast", "frozen singalong"],
  character_meet: ["character meet", "meet and greet", "princess meet", "character experience"],
  live_entertainment: ["entertainment", "performer", "street party", "dj", "dance party"],
};

export const TYPE_PRIORITY: EntertainmentType[] = [
  "fireworks",
  "seasonal_spectacular",
  "parade",
  "show",
  "character_meet",
  "live_entertainment",
];

export const ENTERTAINMENT_CLUSTERS_LIMIT = 6;
