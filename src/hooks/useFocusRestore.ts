import { useCallback, useRef } from "react";
import { AccessibilityInfo, findNodeHandle, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export function useFocusRestore() {
  const savedHandleRef = useRef<number | null>(null);

  const save = useCallback((ref: View | null) => {
    savedHandleRef.current = ref ? findNodeHandle(ref) : null;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const handle = savedHandleRef.current;
      if (!handle) return;
      savedHandleRef.current = null;
      // Delay so the screen slide animation finishes before VoiceOver moves focus
      const timer = setTimeout(() => {
        AccessibilityInfo.setAccessibilityFocus(handle);
      }, 350);
      return () => clearTimeout(timer);
    }, [])
  );

  return { save };
}
