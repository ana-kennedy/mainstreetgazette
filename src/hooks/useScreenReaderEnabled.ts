import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useScreenReaderEnabled(): boolean {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReaderEnabled);
    return () => subscription.remove();
  }, []);

  return screenReaderEnabled;
}
