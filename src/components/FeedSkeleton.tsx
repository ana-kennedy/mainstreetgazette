import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useReduceMotion } from "../hooks/useReduceMotion";

function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { width: width as any, height, borderRadius: 4, backgroundColor: theme.colors.surfaceVariant },
        style,
      ]}
    />
  );
}

function SkeletonCard() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, opacity: reduceMotion ? 0.6 : pulse },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <SkeletonBlock width="70%" height={16} />
      <SkeletonBlock width="40%" height={11} style={{ marginTop: 8 }} />
      <SkeletonBlock width="100%" height={11} style={{ marginTop: 10 }} />
      <SkeletonBlock width="90%" height={11} style={{ marginTop: 6 }} />
    </Animated.View>
  );
}

// Shown only during the very first load (no cached items yet) — everywhere else
// (pull-to-refresh, background refresh) the existing header spinner already covers it.
export function FeedSkeleton() {
  return (
    <View accessibilityLabel="Loading stories" accessible accessibilityRole="progressbar">
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
});
