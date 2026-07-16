import { useEffect } from "react";
import { NativeModules, Platform } from "react-native";

export function useHandoff(url: string | null, title: string | null): void {
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const { MGHandoff } = NativeModules;
    if (!MGHandoff) return;
    if (url && title) {
      MGHandoff.advertise(url, title);
    }
    return () => {
      MGHandoff.resign();
    };
  }, [url, title]);
}
