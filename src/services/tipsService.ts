// Phase 69 — Tips & Discoveries: rotating daily tip pool with seen-tracking.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@msg/seenTipIds";

export interface AppTip {
  id: string;
  icon: string;
  title: string;
  body: string;
  category: "navigation" | "accessibility" | "power" | "discover";
  learnMoreScreen?: string;
}

export const APP_TIPS: AppTip[] = [
  {
    id: "tip-rotor",
    icon: "rotate-3d-variant",
    category: "accessibility",
    title: "VoiceOver Rotor Actions",
    body: "Rotate two fingers on the screen to open the VoiceOver Rotor. Then swipe up or down to Save, Play, or Expand any article without leaving your reading position.",
  },
  {
    id: "tip-load-more-headlines",
    icon: "newspaper-plus",
    category: "navigation",
    title: "Load More Headlines",
    body: "When more stories are available, use the Load More Headlines button at the end of a feed to disclose the next batch without losing your place.",
  },
  {
    id: "tip-smart-view",
    icon: "filter-variant",
    category: "power",
    title: "Smart Views",
    body: "Use the filter bar above the News feed to switch to Articles Only, Videos Only, New Since Last Visit, or Continue Listening.",
  },
  {
    id: "tip-sound-test",
    icon: "volume-high",
    category: "accessibility",
    title: "Test Sound Effects",
    body: "Go to Preferences → Accessibility and scroll to Test Sounds. Tap any button to preview that sound in context.",
  },
  {
    id: "tip-collections",
    icon: "folder-star-outline",
    category: "discover",
    title: "Follow Library Collections",
    body: "Go to the Library tab and tap Follow on any theme — Ride Openings, Food & Dining, Behind the Magic, and more — to pin it to your Library.",
  },
  {
    id: "tip-search-anywhere",
    icon: "magnify",
    category: "navigation",
    title: "Search across everything",
    body: "Tap the Search tab to search all cached articles, videos, and podcasts at once. Results appear instantly as you type.",
  },
  {
    id: "tip-low-vision",
    icon: "eye-outline",
    category: "accessibility",
    title: "Enhanced Spacing",
    body: "Go to Preferences → Accessibility → Vision and enable Enhanced Spacing to increase line height and padding throughout the app.",
  },
  {
    id: "tip-offline",
    icon: "wifi-off",
    category: "power",
    title: "Works offline",
    body: "Main Street Gazette caches your latest feed. You can read, save, and browse articles even without an internet connection.",
  },
  {
    id: "tip-background-refresh",
    icon: "refresh",
    category: "power",
    title: "Background refresh",
    body: "iOS automatically refreshes your feed in the background so it is ready when you open the app.",
  },
  {
    id: "tip-companion",
    icon: "map-marker",
    category: "discover",
    title: "At the park? Activate Companion Mode",
    body: "Open the Explore tab and start a Companion Mode session to get a visit-aware news experience while you are at the park.",
  },
  {
    id: "tip-source-library",
    icon: "rss",
    category: "power",
    title: "Customize your sources",
    body: "Go to Preferences → Source Library to enable or disable individual RSS feeds, YouTube channels, and podcasts.",
  },
  {
    id: "tip-cluster-tap",
    icon: "layers-outline",
    category: "discover",
    title: "See all sides of a story",
    body: "When a story cluster shows a source count badge, tap it to read every source covering that event side by side.",
  },
];

export async function getSeenTipIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export async function markTipSeen(tipId: string): Promise<void> {
  const seen = await getSeenTipIds();
  seen.add(tipId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...seen])).catch(() => {});
}

export async function getNextTip(): Promise<AppTip | null> {
  const seen = await getSeenTipIds();
  const unseen = APP_TIPS.filter((t) => !seen.has(t.id));
  if (unseen.length === 0) {
    // All seen — cycle back from the start
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    return APP_TIPS[0] ?? null;
  }
  return unseen[0]!;
}

export async function getDailyTip(): Promise<AppTip> {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % APP_TIPS.length;
  return APP_TIPS[dayIndex]!;
}

export async function resetSeenTips(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
