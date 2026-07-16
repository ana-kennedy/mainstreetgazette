import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { MGCloudSync } = NativeModules;

// Gracefully unavailable in Expo Go and on Android.
export const isCloudSyncAvailable: boolean = Platform.OS === "ios" && !!MGCloudSync;

const emitter = isCloudSyncAvailable ? new NativeEventEmitter(MGCloudSync) : null;

// Namespaced keys written to NSUbiquitousKeyValueStore.
export const CLOUD_SYNC_KEYS = {
  savedIDs: "msg.savedIDs",
  sourceStates: "msg.sourceStates",
  settings: "msg.settings",
  playbackPositions: "msg.playbackPositions",
  lastSyncAt: "msg.lastSyncAt",
} as const;

export type CloudSyncKey = (typeof CLOUD_SYNC_KEYS)[keyof typeof CLOUD_SYNC_KEYS];

export async function cloudGetValue(key: string): Promise<string | null> {
  if (!isCloudSyncAvailable) return null;
  return MGCloudSync.getValue(key);
}

export async function cloudSetValue(key: string, value: string): Promise<void> {
  if (!isCloudSyncAvailable) return;
  await MGCloudSync.setValue(key, value);
}

export async function cloudRemoveValue(key: string): Promise<void> {
  if (!isCloudSyncAvailable) return;
  await MGCloudSync.removeValue(key);
}

export async function cloudGetAllKeys(): Promise<string[]> {
  if (!isCloudSyncAvailable) return [];
  return MGCloudSync.getAllKeys();
}

export function addCloudSyncChangeListener(
  callback: (keys: string[]) => void
): { remove: () => void } {
  if (!emitter) return { remove: () => {} };
  const sub = emitter.addListener(
    "MGCloudSyncExternalChange",
    ({ keys }: { keys: string[] }) => callback(keys)
  );
  return { remove: () => sub.remove() };
}
