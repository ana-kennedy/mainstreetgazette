// Phase 08 — local notification delivery for Gazette Alerts and Trip Companion
// reminders. Uses expo-notifications' on-device scheduling only (no remote push
// token/server involved) — sufficient for both "notify now" (news alerts, evaluated by
// the background task) and "notify on this future date" (trip reminders).
//
// Per the phase spec: never force a permission prompt during onboarding. This module
// only requests permission when the user explicitly turns on a Gazette Alerts toggle
// (see GazetteAlertsScreen.tsx) — it is never called on app launch.
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionState = "granted" | "denied" | "undetermined";

export async function getNotificationPermissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

// Call only in direct response to a user turning an alert toggle on — never at launch.
export async function requestNotificationPermission(): Promise<PermissionState> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status as PermissionState;
}

// The spec's "Open iPhone Settings" recovery action for a denied permission.
export function openNotificationSettings(): void {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:").catch(() => {});
  } else {
    Linking.openSettings().catch(() => {});
  }
}

export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  const state = await getNotificationPermissionState();
  if (state !== "granted") return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  }).catch(() => {});
}

export async function scheduleNotificationAt(
  id: string,
  title: string,
  body: string,
  date: Date
): Promise<void> {
  const state = await getNotificationPermissionState();
  if (state !== "granted") return;
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  }).catch(() => {});
}

export async function cancelScheduledNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
