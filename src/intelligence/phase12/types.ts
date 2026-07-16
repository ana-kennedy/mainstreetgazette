// Phase 12 — Accessibility Intelligence types
// Depends on: Phase 3 (StoryCluster), Phase 4 (ClassificationResult), Phase 7 (UserPersonalizationPreferences)

export type AccessibilityCategory =
  | "das"
  | "blind_low_vision"
  | "mobility"
  | "service_animals"
  | "captions";

export interface AccessibilityStory {
  clusterId: string;
  primaryItemId: string;
  headline: string;
  summary?: string;
  categories: AccessibilityCategory[];
  primaryCategory: AccessibilityCategory;
  score: number;
  isBreaking: boolean;
  isOfficial: boolean;
  sourceCount: number;
  publishedAt: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export interface AccessibilityHub {
  stories: AccessibilityStory[];
  dasUpdates: AccessibilityStory[];
  computedAt: number;
}
