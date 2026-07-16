import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { buildGraphUIData } from "../intelligence/phase24";
import type { GraphNodeDisplay } from "../intelligence/phase24";
import type { ParksStackParamList } from "../navigation/types";
import { PARK_DISPLAY_NAMES } from "../intelligence/phase16/rules";

type Props = NativeStackScreenProps<ParksStackParamList, "EntityGraph">;

function GraphNodeRow({
  node,
  index,
  onPress,
}: {
  node: GraphNodeDisplay;
  index: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const parkLabel = node.parkIds
    .slice(0, 2)
    .map((p) => PARK_DISPLAY_NAMES[p] ?? p)
    .join(", ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nodeRow,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={node.accessibilityLabel}
      accessibilityHint="Double tap to view all stories about this entity."
    >
      {/* Rank */}
      <Text
        variant="labelSmall"
        style={[styles.rank, { color: theme.colors.onSurfaceVariant }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {index + 1}
      </Text>

      {/* Name + meta */}
      <View style={styles.nodeInfo}>
        <Text
          variant="bodyMedium"
          style={[styles.nodeName, { color: theme.colors.onSurface }]}
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {node.entityName}
        </Text>
        {parkLabel ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {parkLabel}
          </Text>
        ) : null}
      </View>

      {/* Stats */}
      <View style={styles.nodeStats}>
        <View style={[styles.statPill, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onPrimaryContainer, fontWeight: "700" }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {node.clusterCount}
          </Text>
        </View>
        {node.relatedEntityCount > 0 ? (
          <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons
              name={"link" as any}
              size={10}
              color={theme.colors.onSurfaceVariant}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {node.relatedEntityCount}
            </Text>
          </View>
        ) : null}
      </View>

      <MaterialCommunityIcons
        name={"chevron-right" as any}
        size={18}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export function EntityGraphScreen({ navigation }: Props) {
  const app = useAppContext();
  const theme = useTheme();

  const graphData = useMemo(
    () => buildGraphUIData({ clusters: app.clusters, feedItems: app.items }),
    [app.clusters, app.items],
  );

  const header = (
    <View
      style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`Disney entity graph. ${graphData.totalEntityCount} entities, ${graphData.totalEdgeCount} connections.`}
    >
      <MaterialCommunityIcons
        name={"graph" as any}
        size={24}
        color={theme.colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.headerText}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "700" }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          Entity Graph
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {graphData.totalEntityCount} entities · {graphData.totalEdgeCount} connections
        </Text>
      </View>
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        No entities found. Refresh your feed to build the graph.
      </Text>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={graphData.topNodes}
        keyExtractor={(item) => item.entityName}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item, index }) => (
          <GraphNodeRow
            node={item}
            index={index}
            onPress={() =>
              (navigation as any).navigate("News", {
                screen: "EntityProfile",
                params: { entityName: item.entityName },
              })
            }
          />
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rank: {
    width: 24,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },
  nodeInfo: {
    flex: 1,
    gap: 2,
  },
  nodeName: {
    fontWeight: "600",
  },
  nodeStats: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    flexShrink: 0,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
});
