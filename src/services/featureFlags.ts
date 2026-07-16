// Phase 76 — Feature Flags & Remote Config: local flag registry with AsyncStorage overrides.
// Flags are defined with safe defaults and can be overridden at runtime (dev tools or remote config).
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@msg/featureFlags";

export type FlagValue = boolean | string | number;

export interface FeatureFlag {
  id: string;
  description: string;
  defaultValue: FlagValue;
  group: "feed" | "ui" | "accessibility" | "experimental" | "debug" | "redesign";
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlag[] = [
  // Gazette experience redesign (temp/03_IMPLEMENTATION_PHASES) — one flag per major
  // redesigned surface so each phase can ship dark and be enabled independently once
  // it passes acceptance, without deleting the legacy screen it replaces.
  {
    id: "gazetteReaderEnabled",
    description: "Use the unified Gazette Reader in place of the legacy Story Detail screen",
    defaultValue: false,
    group: "redesign",
  },
  {
    id: "exploreRedesignEnabled",
    description: "Use the destination-led Explore tab in place of the legacy Discover tab",
    defaultValue: false,
    group: "redesign",
  },
  {
    id: "gazetteLibraryEnabled",
    description: "Use the redesigned For You / Gazette Library screen",
    defaultValue: false,
    group: "redesign",
  },
  {
    id: "myMagicEnabled",
    description: "Use the My Magic personalization screen in place of the legacy Personalization screen",
    defaultValue: false,
    group: "redesign",
  },
  {
    id: "gazetteAlertsEnabled",
    description: "Use the redesigned Gazette Alerts (Morning Edition, Special Editions, Trip Companion) in place of legacy Notification Preferences",
    defaultValue: false,
    group: "redesign",
  },
  {
    id: "startupWizardEnabled",
    description: "Show the Phase 09 nine-page startup wizard for new installs, in place of the legacy 5-step OnboardingScreen",
    defaultValue: true,
    group: "redesign",
  },
  {
    id: "livingLibraryEnabled",
    description: "Enable living library backfill and destination profile enrichment",
    defaultValue: false,
    group: "redesign",
  },
  {
    id: "heroCardEnabled",
    description: "Show full-width hero card for breaking/featured stories at top of News feed",
    defaultValue: true,
    group: "ui",
  },
  {
    id: "storyClusteringEnabled",
    description: "Group related articles into story clusters",
    defaultValue: true,
    group: "feed",
  },
  {
    id: "companionModeEnabled",
    description: "Show Companion Mode controls in the Explore tab",
    defaultValue: true,
    group: "ui",
  },
  {
    id: "dailyTipEnabled",
    description: "Show rotating daily tip card in the News feed",
    defaultValue: true,
    group: "ui",
  },
  {
    id: "readingHistoryEnabled",
    description: "Track reading history for continue-reading suggestions",
    defaultValue: true,
    group: "feed",
  },
  {
    id: "accessibilityAuditEnabled",
    description: "Run a11y audit on feed items in debug builds",
    defaultValue: false,
    group: "debug",
  },
  {
    id: "diagnosticLoggingEnabled",
    description: "Enable in-memory diagnostic event log",
    defaultValue: true,
    group: "debug",
  },
  {
    id: "iCloudSyncEnabled",
    description: "Allow optional iCloud sync of saves and preferences",
    defaultValue: true,
    group: "feed",
  },
];

let overrides: Record<string, FlagValue> = {};
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    overrides = raw ? JSON.parse(raw) : {};
  } catch {
    overrides = {};
  }
  loaded = true;
}

export async function getFlag(id: string): Promise<FlagValue> {
  await ensureLoaded();
  if (id in overrides) return overrides[id]!;
  const def = FEATURE_FLAG_DEFINITIONS.find((f) => f.id === id);
  return def?.defaultValue ?? false;
}

export async function getFlagBool(id: string): Promise<boolean> {
  return Boolean(await getFlag(id));
}

export async function setFlagOverride(id: string, value: FlagValue): Promise<void> {
  await ensureLoaded();
  overrides[id] = value;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)).catch(() => {});
}

export async function clearFlagOverride(id: string): Promise<void> {
  await ensureLoaded();
  delete overrides[id];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)).catch(() => {});
}

export async function clearAllFlagOverrides(): Promise<void> {
  overrides = {};
  loaded = true;
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export async function getAllFlags(): Promise<Array<FeatureFlag & { currentValue: FlagValue; isOverridden: boolean }>> {
  await ensureLoaded();
  return FEATURE_FLAG_DEFINITIONS.map((def) => ({
    ...def,
    currentValue: def.id in overrides ? overrides[def.id]! : def.defaultValue,
    isOverridden: def.id in overrides,
  }));
}
