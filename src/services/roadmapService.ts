// Phase 80 — Long-Term Roadmap Governance: local roadmap tracking for developer and power users.

export type RoadmapStatus = "shipped" | "in-progress" | "planned" | "considering" | "declined";

export interface RoadmapItem {
  id: string;
  phase?: number;
  title: string;
  description: string;
  status: RoadmapStatus;
  category: "feature" | "accessibility" | "performance" | "infrastructure" | "ux";
  targetVersion?: string;
}

export const ROADMAP: RoadmapItem[] = [
  // Shipped
  { id: "haptics", phase: 1, title: "Haptic feedback", description: "expo-haptics for all key interactions.", status: "shipped", category: "accessibility" },
  { id: "sounds", phase: 1, title: "Sound effects", description: "14 sound events for navigation, save, refresh, error.", status: "shipped", category: "accessibility" },
  { id: "toast", phase: 1, title: "Toast notifications", description: "Animated toast with VoiceOver live region.", status: "shipped", category: "ux" },
  { id: "reduce-motion", phase: 1, title: "Reduce Motion support", description: "useReduceMotion hook skips or crossfades animations.", status: "shipped", category: "accessibility" },
  { id: "voiceover-detail", phase: 1, title: "VoiceOver detail level", description: "Simple / Normal / All Details announcement picker.", status: "shipped", category: "accessibility" },
  { id: "story-clustering", phase: 11, title: "Story clustering", description: "Related articles grouped into topic clusters.", status: "shipped", category: "feature" },
  { id: "analytics", phase: 15, title: "Feed health analytics", description: "Source health, coverage gaps, dedup metrics.", status: "shipped", category: "feature" },
  { id: "settings-overhaul", phase: 25, title: "Settings overhaul", description: "All 16 settings surfaces with full a11y.", status: "shipped", category: "ux" },
  { id: "source-library", phase: 36, title: "Source Library", description: "Searchable browsable source catalogue.", status: "shipped", category: "feature" },
  { id: "error-boundary", phase: 50, title: "Error boundary", description: "Friendly fallback on crash, restart button.", status: "shipped", category: "infrastructure" },
  { id: "design-tokens", phase: 51, title: "Design tokens", description: "Spacing, Radius, Typography, Motion, ZIndex constants.", status: "shipped", category: "infrastructure" },
  { id: "hero-card", phase: 53, title: "Hero breaking card", description: "Full-width hero card for breaking/featured stories.", status: "shipped", category: "ux" },
  { id: "low-vision-utils", phase: 54, title: "Low vision style utilities", description: "getLowVisionConfig / lowVisionTextStyle / lowVisionContainerStyle.", status: "shipped", category: "accessibility" },
  { id: "sound-identity", phase: 56, title: "Sound identity upgrade", description: "Root-level wav files, 7 new sound events.", status: "shipped", category: "accessibility" },
  { id: "companion-mode", phase: 57, title: "Companion Mode", description: "Park visit session context with persistent banner.", status: "shipped", category: "feature" },
  { id: "reading-history", phase: 58, title: "Reading history", description: "AsyncStorage ring buffer for article read tracking.", status: "shipped", category: "feature" },
  { id: "flatlist-perf", phase: 60, title: "FlatList performance", description: "windowSize, maxToRenderPerBatch, removeClippedSubviews.", status: "shipped", category: "performance" },
  { id: "diagnostic-logger", phase: 61, title: "Diagnostic logger", description: "In-memory 200-event ring buffer for observability.", status: "shipped", category: "infrastructure" },
  { id: "a11y-audit", phase: 62, title: "Accessibility audit utility", description: "Runtime feed item audit with diagnostic logger integration.", status: "shipped", category: "accessibility" },
  { id: "plugin-registry", phase: 63, title: "Plugin registry", description: "Type-safe plugin registration for future source adapters.", status: "shipped", category: "infrastructure" },
  { id: "launch-validation", phase: 64, title: "Launch validation", description: "Pre-launch readiness check returning pass/warn/fail report.", status: "shipped", category: "infrastructure" },
  { id: "user-guide", phase: 67, title: "Built-in user guide", description: "Searchable in-app help with 20 articles across 8 sections.", status: "shipped", category: "ux" },
  { id: "tutorials", phase: 68, title: "Interactive tutorials", description: "Step-based tutorial engine with completion tracking.", status: "shipped", category: "ux" },
  { id: "tips", phase: 69, title: "Tips & Discoveries", description: "Rotating tip pool with seen-tracking.", status: "shipped", category: "ux" },
  { id: "feedback", phase: 72, title: "Feedback email composer", description: "Pre-filled feedback email with diagnostic context.", status: "shipped", category: "ux" },
  { id: "whats-new", phase: 73, title: "What's New screen", description: "Post-update highlight screen with icon cards.", status: "shipped", category: "ux" },
  { id: "feature-flags", phase: 76, title: "Feature flags", description: "Local flag registry with AsyncStorage overrides.", status: "shipped", category: "infrastructure" },
  { id: "migrations", phase: 77, title: "Migration service", description: "Versioned settings migration runner.", status: "shipped", category: "infrastructure" },
  { id: "content-quality", phase: 78, title: "Content quality rules", description: "Clickbait, duplicate URL, and stale item filtering.", status: "shipped", category: "infrastructure" },

  // Planned
  { id: "widget", title: "WidgetKit widget", description: "Today widget showing latest breaking story.", status: "planned", category: "feature", targetVersion: "1.1.0" },
  { id: "siri-intents", title: "Siri Intents", description: "Shortcut to open the app to latest news or saved items.", status: "planned", category: "feature", targetVersion: "1.1.0" },
  { id: "spotlight", title: "Spotlight search", description: "Index saved articles in Spotlight.", status: "planned", category: "feature", targetVersion: "1.1.0" },
  { id: "apple-intelligence", title: "Apple Intelligence summaries", description: "On-device article summary via iOS 26 Foundation Models.", status: "considering", category: "feature" },
  { id: "dynamic-type-full", title: "Full Dynamic Type pass", description: "sp() hook for all font sizes, Reduce Transparency support.", status: "planned", category: "accessibility", targetVersion: "1.1.0" },
];

export function getRoadmapByStatus(status: RoadmapStatus): RoadmapItem[] {
  return ROADMAP.filter((i) => i.status === status);
}

export function getRoadmapByCategory(category: RoadmapItem["category"]): RoadmapItem[] {
  return ROADMAP.filter((i) => i.category === category);
}

export function roadmapSummary(): Record<RoadmapStatus, number> {
  const counts: Record<RoadmapStatus, number> = { shipped: 0, "in-progress": 0, planned: 0, considering: 0, declined: 0 };
  for (const item of ROADMAP) counts[item.status]++;
  return counts;
}
