import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

interface Props {
  title: string;
  expanded: boolean;
  onChange: (expanded: boolean) => void;
  children: React.ReactNode;
  contentAnnouncement?: string;
}

export function AccessibleDisclosure({ title, expanded, onChange, children, contentAnnouncement }: Props) {
  const theme = useTheme();

  const toggle = () => {
    const next = !expanded;
    onChange(next);
    AccessibilityInfo.announceForAccessibility(
      next ? `${title} expanded. ${contentAnnouncement ?? "Content follows."}` : `${title} collapsed.`
    );
  };

  return (
    <View style={[styles.container, { borderColor: theme.colors.outlineVariant }]}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }} accessibilityRole="header">
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? "Double tap to collapse." : "Double tap to expand."}
        onPress={toggle}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface },
        ]}
      >
        <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
          {expanded ? "Collapse" : "Expand"}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.primary}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  button: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  buttonText: {
    fontWeight: "700",
  },
  body: {
    gap: 8,
  },
});
