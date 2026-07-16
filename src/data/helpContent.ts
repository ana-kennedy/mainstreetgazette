// Shared help content data — used by UserGuide, FAQ, Troubleshooting, and AccessibilityGuide.

export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  section: HelpSection;
}

export type HelpSection =
  | "gettingStarted"
  | "news"
  | "explore"
  | "collections"
  | "sources"
  | "accessibility"
  | "troubleshooting"
  | "privacy";

export const HELP_SECTION_LABELS: Record<HelpSection, string> = {
  gettingStarted: "Getting Started",
  news: "News",
  explore: "Explore",
  collections: "Library",
  sources: "Sources",
  accessibility: "Accessibility",
  troubleshooting: "Troubleshooting",
  privacy: "Privacy & Data",
};

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting Started ──
  {
    id: "gs-what-is-msg",
    section: "gettingStarted",
    title: "What is Main Street Gazette?",
    summary: "Your all-in-one Disney news aggregator.",
    body: "Main Street Gazette collects news, videos, and podcasts from dozens of Disney sources into a single accessible feed. Stories from multiple sources are automatically grouped into clusters so you always see the full picture.",
    tags: ["intro", "overview"],
  },
  {
    id: "gs-destinations",
    section: "gettingStarted",
    title: "Choosing your Disney destinations",
    summary: "Filter news by park or resort.",
    body: "Go to Preferences → My Disney Interests to select which parks and resorts you care about. Your choices filter the News feed and power the Explore tab. You can change them anytime.",
    tags: ["destinations", "parks", "filter", "setup"],
  },
  {
    id: "gs-tabs",
    section: "gettingStarted",
    title: "Understanding the five tabs",
    summary: "News, Explore, Search, Library, Preferences.",
    body: "News shows your personalised feed. Explore lets you browse parks, attractions, and events. Search finds articles, videos, or podcasts. Library organises saved and followed content. Preferences controls every app setting.",
    tags: ["tabs", "navigation", "overview"],
  },

  // ── News ──
  {
    id: "news-clusters",
    section: "news",
    title: "What are story clusters?",
    summary: "Multiple sources, one story.",
    body: "When several sources publish about the same event, the app groups them into a story cluster. The cluster shows the most relevant headline and the number of sources. Tap to read all sources side by side.",
    tags: ["clusters", "stories", "grouping"],
  },
  {
    id: "news-breaking",
    section: "news",
    title: "Breaking news and official updates",
    summary: "Spot important news instantly.",
    body: "Breaking news appears with an orange BREAKING badge. Official updates from Disney directly appear with a OFFICIAL label. Both appear at the top of your feed when they arrive.",
    tags: ["breaking", "official", "badge"],
  },
  {
    id: "news-save",
    section: "news",
    title: "Saving articles for later",
    summary: "Bookmark any item with one tap.",
    body: "Tap the bookmark icon on any article, video, or podcast to save it. Find saved items in the Library tab under Saved Articles. Your saves are stored on your device and optionally synced to iCloud.",
    tags: ["save", "bookmark", "collections"],
  },
  {
    id: "news-smart-views",
    section: "news",
    title: "Smart Views and filters",
    summary: "Focus your feed in one tap.",
    body: "Use the filter bar above your feed to switch to views like Articles Only, Videos Only, Continue Listening, or New Since Last Visit. The filter is remembered until you change it.",
    tags: ["filter", "smart view", "articles", "videos", "podcasts"],
  },

  // ── Explore ──
  {
    id: "explore-parks",
    section: "explore",
    title: "Browsing parks and attractions",
    summary: "Tap any park to see its latest news.",
    body: "The Explore tab shows Disney destinations. Tap a park to filter the feed to that destination. Attractions, restaurants, and events within the park surface related articles automatically.",
    tags: ["explore", "parks", "attractions", "browse"],
  },

  // ── Library ──
  {
    id: "collections-what",
    section: "collections",
    title: "What are Library collections?",
    summary: "Curated themes combining news, videos, and more.",
    body: "Library collections group related content by theme — Ride Openings, Food & Dining, Behind the Magic, and more. Follow a collection to see it highlighted in your feed. Saved Articles is always in your Library tab.",
    tags: ["collections", "themes", "follow"],
  },
  {
    id: "collections-follow",
    section: "collections",
    title: "Following and unfollowing Library collections",
    summary: "Pin collections you care about.",
    body: "Tap Follow on any collection to pin it to your Library tab. Followed collections appear under FOLLOWING. Tap Again to unfollow. Your followed collections are stored locally.",
    tags: ["follow", "unfollow", "collections"],
  },

  // ── Sources ──
  {
    id: "sources-manage",
    section: "sources",
    title: "Managing your sources",
    summary: "Enable or disable individual feeds.",
    body: "Go to Preferences → Source Library to see every available source. Toggle sources on or off. Official Disney sources are enabled by default. Community and social sources can be turned on individually.",
    tags: ["sources", "manage", "enable", "disable", "rss"],
  },
  {
    id: "sources-health",
    section: "sources",
    title: "Feed health and diagnostics",
    summary: "See which sources are working.",
    body: "Go to Preferences → Advanced & About → Feed Health to see which sources are active, slow, or failing. Failing sources have an error indicator. You can disable a failing source until it recovers.",
    tags: ["health", "diagnostics", "feed", "failing", "analytics"],
  },

  // ── Accessibility ──
  {
    id: "a11y-voiceover",
    section: "accessibility",
    title: "VoiceOver support",
    summary: "Every screen is designed for VoiceOver.",
    body: "Every feed item has a spoken label with source, headline, age, and content type. Use the Rotor to access Save, Play, and Expand actions without leaving the item. Go to Preferences → Accessibility to choose Simple, Normal, or All Details announcement level.",
    tags: ["voiceover", "screen reader", "rotor", "a11y"],
  },
  {
    id: "a11y-braille",
    section: "accessibility",
    title: "Braille display support",
    summary: "Compact labels optimised for 40-cell displays.",
    body: "Simple announcement level truncates titles to ~60 characters so labels fit on a 40-cell braille display in two pans. Use the Rotor to hear extra detail on demand.",
    tags: ["braille", "display", "rotor", "a11y"],
  },
  {
    id: "a11y-large-text",
    section: "accessibility",
    title: "Large text and Dynamic Type",
    summary: "Respects your iOS text size setting.",
    body: "All text scales with your iOS text size preference. Enable Enhanced Spacing in Preferences → Accessibility to increase line height and padding throughout the app.",
    tags: ["dynamic type", "large text", "low vision", "spacing"],
  },
  {
    id: "a11y-sounds",
    section: "accessibility",
    title: "Sound effects",
    summary: "Audible confirmation for every action.",
    body: "The app plays a distinct sound for saving, refreshing, errors, going offline, and more. Go to Preferences → Accessibility → Test Sounds to preview each one. Toggle all sound effects off in the same screen.",
    tags: ["sound", "audio", "haptics", "feedback"],
  },
  {
    id: "a11y-haptics",
    section: "accessibility",
    title: "Haptic feedback",
    summary: "Tactile confirmation for key actions.",
    body: "The app uses haptic feedback when you save, refresh, or encounter an error. You can turn haptics on or off independently from sound in Preferences → Accessibility.",
    tags: ["haptics", "vibration", "feedback"],
  },

  // ── Troubleshooting ──
  {
    id: "ts-feed-not-updating",
    section: "troubleshooting",
    title: "Feed is not updating",
    summary: "Pull down to refresh, check your connection.",
    body: "Pull down on the News feed to refresh. If articles still don't update, check that you have an internet connection. Go to Preferences → Advanced & About → Feed Health to see if specific sources are failing. Tap Clear Cache to force a fresh download.",
    tags: ["refresh", "update", "stuck", "feed", "troubleshooting"],
  },
  {
    id: "ts-icloud-sync",
    section: "troubleshooting",
    title: "iCloud sync not working",
    summary: "Check iCloud Drive is enabled.",
    body: "Open iOS Settings → Your Name → iCloud → iCloud Drive and make sure it is on. Then open iOS Settings → Main Street Gazette and confirm iCloud is enabled. Sync resumes automatically when iCloud is available.",
    tags: ["icloud", "sync", "settings", "troubleshooting"],
  },
  {
    id: "ts-notifications",
    section: "troubleshooting",
    title: "Notifications not arriving",
    summary: "Check iOS notification permissions.",
    body: "Open iOS Settings → Main Street Gazette → Notifications and make sure Allow Notifications is on. In the app, go to Preferences → Notifications and verify breaking news alerts are enabled.",
    tags: ["notifications", "alerts", "permissions", "troubleshooting"],
  },

  // ── Privacy ──
  {
    id: "privacy-data",
    section: "privacy",
    title: "What data does the app store?",
    summary: "Everything stays on your device.",
    body: "Main Street Gazette stores your saved articles, read history, and preferences on your device. No personal data is sent to our servers. Optional iCloud sync uses Apple's encrypted iCloud infrastructure.",
    tags: ["privacy", "data", "storage", "icloud"],
  },
];

export function searchHelpContent(query: string): HelpArticle[] {
  if (!query.trim()) return HELP_ARTICLES;
  const q = query.toLowerCase();
  return HELP_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      a.tags.some((t) => t.includes(q)),
  );
}

export function getArticlesBySection(section: HelpSection): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.section === section);
}

export const FAQ_IDS = [
  "gs-what-is-msg",
  "news-clusters",
  "news-save",
  "sources-manage",
  "ts-feed-not-updating",
  "ts-icloud-sync",
  "ts-notifications",
  "privacy-data",
];

export const TROUBLESHOOTING_IDS = [
  "ts-feed-not-updating",
  "ts-icloud-sync",
  "ts-notifications",
  "sources-health",
];

export const ACCESSIBILITY_GUIDE_IDS = [
  "a11y-voiceover",
  "a11y-braille",
  "a11y-large-text",
  "a11y-sounds",
  "a11y-haptics",
];
