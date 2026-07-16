import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

interface EmptyStateProps {
  title: string;
  body: string;
  icon?: string;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, icon, iconColor, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {icon ? (
        <MaterialCommunityIcons
          name={icon as any}
          size={52}
          color={iconColor ?? theme.colors.onSurfaceVariant}
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      <Text variant="titleLarge" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodyLarge" style={styles.body}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button
          mode="contained"
          onPress={onAction}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          accessibilityHint="Double tap to perform this action."
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  icon: {
    marginBottom: 4,
    opacity: 0.55,
  },
  title: {
    textAlign: "center",
  },
  body: {
    textAlign: "center",
  },
});
