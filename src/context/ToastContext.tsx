import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { useHaptics } from "../hooks/useHaptics";
import { useSounds } from "./SoundContext";

export type ToastType = "success" | "warning" | "error" | "info";

interface ToastEntry {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let nextID = 0;
const DISPLAY_DURATION = 3500;
const ENTER_DURATION = 220;
const EXIT_DURATION = 180;

function ToastItem({
  entry,
  onDone,
  reduceMotion,
}: {
  entry: ToastEntry;
  onDone: (id: number) => void;
  reduceMotion: boolean;
}) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 16)).current;

  useEffect(() => {
    const enter = reduceMotion
      ? Animated.timing(opacity, { toValue: 1, duration: ENTER_DURATION, useNativeDriver: true })
      : Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: ENTER_DURATION, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: ENTER_DURATION, useNativeDriver: true }),
        ]);

    enter.start(() => {
      const timer = setTimeout(() => {
        const exit = reduceMotion
          ? Animated.timing(opacity, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true })
          : Animated.parallel([
              Animated.timing(opacity, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true }),
              Animated.timing(translateY, { toValue: 16, duration: EXIT_DURATION, useNativeDriver: true }),
            ]);
        exit.start(() => onDone(entry.id));
      }, DISPLAY_DURATION);
      return () => clearTimeout(timer);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bgColor =
    entry.type === "success" ? "#34C759" :
    entry.type === "warning" ? "#FF9F0A" :
    entry.type === "error"   ? "#FF3B30" :
    theme.colors.primary;

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: bgColor, opacity, transform: [{ translateY }] }]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={entry.message}
    >
      <Text style={styles.toastText} numberOfLines={3}>{entry.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const reduceMotion = useReduceMotion();
  const haptics = useHaptics();
  const sounds = useSounds();
  const insets = useSafeAreaInsets();

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++nextID;
      setToasts((prev) => [...prev.slice(-1), { id, message, type }]);

      // Dual announcement: live region handles braille displays,
      // announceForAccessibility handles VoiceOver speech.
      if (Platform.OS === "ios") {
        AccessibilityInfo.announceForAccessibility(message);
      }

      if (type === "success") {
        haptics.success();
        sounds.playRefreshComplete();
      } else if (type === "warning") {
        haptics.warning();
        sounds.playError();
      } else if (type === "error") {
        haptics.error();
        sounds.playError();
      } else {
        sounds.playTip();
      }
    },
    [haptics, sounds]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={[styles.container, { bottom: insets.bottom + 80 }]}
        pointerEvents="none"
      >
        {toasts.map((entry) => (
          <ToastItem
            key={entry.id}
            entry={entry}
            onDone={removeToast}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "stretch",
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
});
