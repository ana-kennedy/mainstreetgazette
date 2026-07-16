// Phase 10 — Collections scoring and matching rules

// Minimum number of clusters required before an auto-collection is surfaced
export const AUTO_COLLECTION_MIN_CLUSTERS = 3;

// How many clusters to show per collection in the shelf preview
export const COLLECTION_SHELF_PREVIEW_COUNT = 8;

// Max auto-collections to generate (ranked by cluster count)
export const AUTO_COLLECTION_MAX = 5;

// Icon defaults by collection type hint (keyword in title)
export const COLLECTION_ICON_MAP: Record<string, string> = {
  halloween: "ghost",
  festival: "firework",
  dining: "silverware-fork-knife",
  accessibility: "human-wheelchair",
  das: "human-wheelchair",
  cruise: "ferry",
  construction: "hammer",
  attraction: "ticket-confirmation",
  land: "map-marker",
  refurb: "tools",
  trip: "bag-suitcase",
  planning: "calendar-check",
  rumor: "help-circle",
  breaking: "lightning-bolt",
  official: "bullhorn",
};

export function iconForCollection(title: string): string {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(COLLECTION_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return "folder-star";
}
