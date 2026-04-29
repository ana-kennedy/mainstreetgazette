import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
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
    padding: 24,
    gap: 12
  },
  title: {
    textAlign: "center"
  },
  body: {
    textAlign: "center"
  }
});
