// Phase 65 — Welcome Experience: tracks first-launch welcome state and tour completion.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  tourShown: "@msg/tourShown",
  lastSeenVersion: "@msg/lastSeenVersion",
  whatsNewShown: "@msg/whatsNewShown",
  quickStartDismissed: "@msg/quickStartDismissed",
} as const;

export async function markTourShown(): Promise<void> {
  await AsyncStorage.setItem(KEYS.tourShown, "true").catch(() => {});
}

export async function hasTourBeenShown(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.tourShown).catch(() => null);
  return v === "true";
}

export async function recordSeenVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastSeenVersion, version).catch(() => {});
}

export async function getLastSeenVersion(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastSeenVersion).catch(() => null);
}

export async function shouldShowWhatsNew(currentVersion: string): Promise<boolean> {
  const last = await getLastSeenVersion();
  return last !== null && last !== currentVersion;
}

export async function markWhatsNewSeen(version: string): Promise<void> {
  await recordSeenVersion(version);
  await AsyncStorage.setItem(KEYS.whatsNewShown, version).catch(() => {});
}

export async function dismissQuickStart(): Promise<void> {
  await AsyncStorage.setItem(KEYS.quickStartDismissed, "true").catch(() => {});
}

export async function isQuickStartDismissed(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.quickStartDismissed).catch(() => null);
  return v === "true";
}
