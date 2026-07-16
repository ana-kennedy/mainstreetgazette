import { useEffect, useState } from "react";
import { AppState, PixelRatio } from "react-native";

export interface DynamicTypeState {
  fontScale: number;
  isLargeText: boolean;      // fontScale >= 1.3 (Large / XL / XXL)
  isExtraLargeText: boolean; // fontScale >= 1.7 (AX1–AX5 accessibility sizes)
}

function getState(): DynamicTypeState {
  const fontScale = PixelRatio.getFontScale();
  return {
    fontScale,
    isLargeText: fontScale >= 1.3,
    isExtraLargeText: fontScale >= 1.7,
  };
}

// PixelRatio.getFontScale() doesn't emit events — we check on every app foreground
// (the user changes the text size in Settings and returns to the app).
export function useDynamicType(): DynamicTypeState {
  const [state, setState] = useState(getState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") setState(getState());
    });
    return () => sub.remove();
  }, []);

  return state;
}
