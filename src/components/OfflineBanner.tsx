import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNetworkState } from "../hooks/useNetworkState";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { useSounds } from "../context/SoundContext";

// Wait 2 seconds before showing/announcing to avoid reacting to brief network blips.
const DEBOUNCE_MS = 2000;
const SLIDE_IN_MS = 220;
const SLIDE_OUT_MS = 180;

export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { t } = useTranslation();
  const { playOffline, playReconnect } = useSounds();
  const { isConnected, connectionType } = useNetworkState();

  const isOffline = !isConnected || connectionType === "none";
  const [visible, setVisible] = useState(false);
  const wasOfflineRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(-80)).current;

  // Animate banner in/out
  useEffect(() => {
    const toValue = visible ? 0 : -80;
    const duration = visible ? SLIDE_IN_MS : SLIDE_OUT_MS;
    if (reduceMotion) {
      slideAnim.setValue(visible ? 0 : -80);
    } else {
      Animated.timing(slideAnim, { toValue, duration, useNativeDriver: true }).start();
    }
  }, [visible, reduceMotion, slideAnim]);

  // Debounce offline/online transitions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (isOffline && !wasOfflineRef.current) {
      debounceRef.current = setTimeout(() => {
        wasOfflineRef.current = true;
        setVisible(true);
        playOffline();
        if (Platform.OS === "ios") {
          AccessibilityInfo.announceForAccessibility(
            `${t("offline.noConnection")} ${t("offline.cachedArticles")}`
          );
        }
      }, DEBOUNCE_MS);
    } else if (!isOffline && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setVisible(false);
      playReconnect();
      if (Platform.OS === "ios") {
        AccessibilityInfo.announceForAccessibility(t("offline.restored"));
      }
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.error,
          paddingTop: insets.top + 6,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion={visible ? "assertive" : "none"}
      accessibilityLabel={`${t("offline.noConnection")} ${t("offline.cachedArticles")}`}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "yes" : "no-hide-descendants"}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: theme.colors.onError }]}>
        {t("offline.noConnection")}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    alignItems: "center",
    zIndex: 9998,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
