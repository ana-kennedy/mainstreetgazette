import { useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useAppContext } from "../context/AppContext";

export function useHaptics() {
  const { settings } = useAppContext();
  const enabled = (settings?.hapticsEnabled ?? true) && Platform.OS === "ios";

  const success = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [enabled]);

  const warning = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [enabled]);

  const error = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [enabled]);

  const light = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [enabled]);

  const medium = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [enabled]);

  return { success, warning, error, light, medium };
}
