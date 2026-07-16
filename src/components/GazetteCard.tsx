// Phase 01 (Gazette experience redesign) — shared card chrome (radius, padding,
// border, elevation) and the "one focus stop plus custom actions" accessibility
// pattern required by temp/06_ACCESSIBILITY/ACCESSIBILITY_STANDARD.md and
// temp/07_VISUAL_AND_SOUND/VISUAL_DESIGN_SYSTEM.md ("thin rules and contrast
// over heavy shadows"). Individual card types (FeedItemCard, HeroCard, etc.)
// can adopt this as their outer wrapper without re-deriving the chrome.
import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "react-native-paper";
import { Border, Radius, Spacing } from "../theme/designTokens";

interface GazetteCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  style?: StyleProp<ViewStyle>;
}

export function GazetteCard({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  style,
}: GazetteCardProps) {
  const theme = useTheme();
  const chrome: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
  };

  if (!onPress) {
    return (
      <View
        style={[styles.card, chrome, style]}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={onAccessibilityAction}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        chrome,
        pressed ? { backgroundColor: theme.colors.surfaceVariant } : null,
        style,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: Border.thin,
    padding: Spacing.base,
  },
});
