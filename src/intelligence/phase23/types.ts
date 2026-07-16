// Phase 23 — Accessibility Explorer

export type AccessibilityTopicType =
  | "das"
  | "mobility"
  | "visual"
  | "hearing"
  | "service_animals"
  | "sensory"
  | "general";

export interface AccessibilityNewsItem {
  clusterId: string;
  headline: string;
  publishedAt: string;
  isOfficial: boolean;
  topic: AccessibilityTopicType;
  accessibilityLabel: string;
}

export interface ParkAccessibilityIntelligence {
  parkTagKey: string;
  items: AccessibilityNewsItem[];
  hasDasUpdate: boolean;
  computedAt: number;
}
