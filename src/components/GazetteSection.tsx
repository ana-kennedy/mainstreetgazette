// Phase 01 (Gazette experience redesign) — shared titled-section wrapper for
// News/Explore/For You body content. Every section title is a real heading per
// temp/06_ACCESSIBILITY/ACCESSIBILITY_STANDARD.md.
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Pressable } from "react-native";
import { Spacing, Typography } from "../theme/designTokens";

interface GazetteSectionAction {
  label: string;
  accessibilityHint?: string;
  onPress: () => void;
}

interface GazetteSectionProps {
  title: string;
  action?: GazetteSectionAction;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GazetteSection({ title, action, children, style }: GazetteSectionProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text
          style={[Typography.sectionHeader, { color: theme.colors.onSurfaceVariant }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.accessibilityHint}
            hitSlop={8}
          >
            <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
