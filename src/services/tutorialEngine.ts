// Phase 68 — Interactive Tutorials: step definitions and completion tracking.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@msg/tutorialProgress";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetTab?: string;
  action?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  steps: TutorialStep[];
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "first-news",
    title: "Reading Your First Story",
    description: "Learn how to browse and read Disney news.",
    estimatedMinutes: 2,
    steps: [
      {
        id: "open-news",
        icon: "newspaper-variant-outline",
        title: "Open the News tab",
        description: "Tap News at the bottom of the screen. Your personalised feed loads here.",
        targetTab: "News",
      },
      {
        id: "tap-story",
        icon: "gesture-tap",
        title: "Tap any headline",
        description: "Tap a story card to open the full article in the reader.",
      },
      {
        id: "save-article",
        icon: "bookmark-outline",
        title: "Save for later",
        description: "Tap the bookmark icon to save the article. Find it in Library → Saved Articles.",
      },
    ],
  },
  {
    id: "sources-setup",
    title: "Setting Up Your Sources",
    description: "Choose which news feeds appear in your app.",
    estimatedMinutes: 3,
    steps: [
      {
        id: "open-prefs",
        icon: "cog-outline",
        title: "Open Preferences",
        description: "Tap Preferences at the bottom-right of the screen.",
        targetTab: "Preferences",
      },
      {
        id: "open-source-library",
        icon: "rss",
        title: "Tap Source Library",
        description: "Browse every available source. Toggle individual sources on or off.",
      },
      {
        id: "check-health",
        icon: "heart-pulse",
        title: "Check feed health",
        description: "Go to Advanced & About → Feed Health to see which sources are working.",
      },
    ],
  },
  {
    id: "accessibility-setup",
    title: "Configuring Accessibility",
    description: "Make the app work perfectly for you.",
    estimatedMinutes: 2,
    steps: [
      {
        id: "open-a11y",
        icon: "human",
        title: "Open Accessibility preferences",
        description: "Go to Preferences → Accessibility.",
        targetTab: "Preferences",
      },
      {
        id: "pick-level",
        icon: "format-list-bulleted",
        title: "Choose VoiceOver detail level",
        description: "Pick Simple (fastest), Normal (balanced), or All Details (verbose) to control how much VoiceOver reads per item.",
      },
      {
        id: "test-sounds",
        icon: "volume-high",
        title: "Test sounds",
        description: "Enable Sound Effects then tap Test Sounds to hear each sound in context.",
      },
    ],
  },
];

export async function getCompletedSteps(): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function markStepComplete(stepId: string): Promise<void> {
  const completed = await getCompletedSteps();
  completed[stepId] = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completed)).catch(() => {});
}

export async function isTutorialComplete(tutorial: Tutorial): Promise<boolean> {
  const completed = await getCompletedSteps();
  return tutorial.steps.every((s) => completed[s.id]);
}

export async function resetTutorials(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
