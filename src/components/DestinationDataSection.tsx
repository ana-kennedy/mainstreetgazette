import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import type { DestinationSectionState } from "../types/exploreTypes";
import { AccessibleDisclosure } from "./AccessibleDisclosure";

interface Props<T> {
  title: string;
  state: DestinationSectionState<T>;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onRetry: () => void;
  renderData: (data: T) => React.ReactNode;
  contentAnnouncement?: string;
}

export function DestinationDataSection<T>({
  title,
  state,
  expanded,
  onExpandedChange,
  onRetry,
  renderData,
  contentAnnouncement,
}: Props<T>) {
  const theme = useTheme();
  if (state.status === "idle") return null;

  return (
    <AccessibleDisclosure
      title={title}
      expanded={expanded}
      onChange={onExpandedChange}
      contentAnnouncement={contentAnnouncement}
    >
      {state.status === "loading" ? (
        <View accessible accessibilityLabel={`Loading ${title.toLowerCase()}.`} style={styles.loading}>
          <ActivityIndicator />
          <Text>Loading {title.toLowerCase()}...</Text>
        </View>
      ) : null}

      {state.status === "available" || state.status === "stale" ? (
        <View style={styles.stateBlock}>
          {state.status === "stale" ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Showing saved information.</Text>
          ) : null}
          {renderData(state.data)}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Updated {new Date(state.updatedAt).toLocaleString()}. Source: {state.sourceLabel}.
          </Text>
        </View>
      ) : null}

      {state.status === "empty" ? <Text style={{ color: theme.colors.onSurfaceVariant }}>{state.message}</Text> : null}

      {state.status === "error" ? (
        <View style={styles.stateBlock}>
          <Text style={{ color: theme.colors.error }}>{state.message}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Retry {title}</Text>
          </Pressable>
        </View>
      ) : null}
    </AccessibleDisclosure>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stateBlock: {
    gap: 8,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: "center",
  },
});
