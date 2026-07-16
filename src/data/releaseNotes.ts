// Phase 73 — What's New: release note history shown after version upgrades.

export interface ReleaseNote {
  version: string;
  buildNumber?: number;
  date: string;
  headline: string;
  highlights: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  isAccessibilityFocused?: boolean;
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.8",
    date: "2026-06-29",
    headline: "The Living Platform Update",
    highlights: [
      {
        icon: "school-outline",
        title: "Built-in User Guide",
        description: "Every feature explained inside the app. Find it in Preferences → Help.",
      },
      {
        icon: "lightbulb-outline",
        title: "Tips & Discoveries",
        description: "Rotating daily tips help you find hidden features as you use the app.",
      },
      {
        icon: "star-shooting-outline",
        title: "Hero Breaking News Card",
        description: "Breaking stories now appear as a full-width hero card at the top of your feed.",
      },
      {
        icon: "volume-high",
        title: "Upgraded Sound Library",
        description: "Seven sound events upgraded to higher-quality audio files, plus seven new sounds.",
      },
      {
        icon: "eye-outline",
        title: "Low Vision Utilities",
        description: "Enhanced spacing and bold metadata options now have a dedicated utility layer for consistent application.",
      },
      {
        icon: "map-marker",
        title: "Companion Mode",
        description: "Going to the park? Activate Companion Mode for a visit-aware news experience.",
      },
    ],
    isAccessibilityFocused: true,
  },
  {
    version: "1.0.7",
    buildNumber: 11,
    date: "2026-06-01",
    headline: "Persistence & Background Fetch",
    highlights: [
      {
        icon: "history",
        title: "Persistent Article History",
        description: "Read articles are remembered across app restarts.",
      },
      {
        icon: "refresh",
        title: "Background Auto-Fetch",
        description: "News refreshes in the background so your feed is always current.",
      },
      {
        icon: "animation",
        title: "Feed Item Fade-In",
        description: "New articles appear with a smooth fade animation.",
      },
    ],
  },
  {
    version: "1.0.6",
    date: "2025-12-01",
    headline: "Parks, Sounds & Sources",
    highlights: [
      {
        icon: "castle",
        title: "Park Timeline Filters",
        description: "Filter news by individual Disney park or resort.",
      },
      {
        icon: "volume-medium",
        title: "Sound Effects",
        description: "Twelve sound effects for navigation, saving, refresh, and more.",
      },
      {
        icon: "rss",
        title: "International Sources",
        description: "Added sources covering Disneyland Paris, Tokyo Disney, and more.",
      },
    ],
  },
];

export function getLatestReleaseNote(): ReleaseNote {
  return RELEASE_NOTES[0];
}

export function getReleaseNote(version: string): ReleaseNote | undefined {
  return RELEASE_NOTES.find((r) => r.version === version);
}
