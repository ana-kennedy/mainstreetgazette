import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export interface SystemAccessibilityState {
  isBoldText: boolean;
  isGrayscale: boolean;
  isReduceTransparency: boolean;
}

export function useSystemAccessibility(): SystemAccessibilityState {
  const [state, setState] = useState<SystemAccessibilityState>({
    isBoldText: false,
    isGrayscale: false,
    isReduceTransparency: false,
  });

  useEffect(() => {
    Promise.all([
      AccessibilityInfo.isBoldTextEnabled(),
      AccessibilityInfo.isGrayscaleEnabled(),
      AccessibilityInfo.isReduceTransparencyEnabled(),
    ])
      .then(([isBoldText, isGrayscale, isReduceTransparency]) => {
        setState({ isBoldText, isGrayscale, isReduceTransparency });
      })
      .catch(() => {});

    const subs = [
      AccessibilityInfo.addEventListener("boldTextChanged", (v) =>
        setState((prev) => ({ ...prev, isBoldText: v }))
      ),
      AccessibilityInfo.addEventListener("grayscaleChanged", (v) =>
        setState((prev) => ({ ...prev, isGrayscale: v }))
      ),
      AccessibilityInfo.addEventListener("reduceTransparencyChanged", (v) =>
        setState((prev) => ({ ...prev, isReduceTransparency: v }))
      ),
    ];

    return () => { for (const sub of subs) sub.remove(); };
  }, []);

  return state;
}
