import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppContext } from "../context/AppContext";
import { buildEntityGraph, getEntityProfile } from "../intelligence/phase16";
import { PARK_DISPLAY_NAMES, RELATIONSHIP_LABELS } from "../intelligence/phase16/rules";
import type { ClusterSummary, RelatedEntityEntry } from "../intelligence/phase16/types";
import type { NewsStackParamList } from "../navigation/types";
import { relativePublishedText } from "../utils/formatting";

type Props = NativeStackScreenProps<NewsStackParamList, "EntityProfile">;

// ── Sub-components ────────────────────────────────────────────────────────────

function ClusterRow({
  cluster,
  onPress,
}: {
  cluster: ClusterSummary;
  onPress: () => void;
}) {
  const theme = useTheme();
  const publishedText = relativePublishedText(cluster.publishedAt).replace(/\.$/, "");

  return (
    <Pressable
      onPress={onPress}
      style={[styles.clusterRow, { borderBottomColor: theme.colors.outlineVariant }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${cluster.headline}. ${publishedText}. ${cluster.sourceCount} ${cluster.sourceCount === 1 ? "source" : "sources"}.${cluster.isBreaking ? " Breaking." : ""}${cluster.isOfficial ? " Official." : ""}`}
      accessibilityHint="Double tap to open this story."
    >
      <View
        style={styles.clusterBadgeRow}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {cluster.isBreaking ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
            <Text style={[styles.badgeText, { color: theme.colors.onError }]}>BREAKING</Text>
          </View>
        ) : null}
        {cluster.isOfficial ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.badgeText, { color: theme.colors.onPrimaryContainer }]}>OFFICIAL</Text>
          </View>
        ) : null}
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {publishedText}
          {cluster.sourceCount > 1 ? ` · ${cluster.sourceCount} sources` : ""}
        </Text>
      </View>
      <Text
        variant="bodyMedium"
        numberOfLines={3}
        style={[styles.clusterHeadline, { color: theme.colors.onSurface }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {cluster.headline}
      </Text>
      <Button
        mode="text"
        compact
        onPress={onPress}
        style={styles.openButton}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        Open
      </Button>
    </Pressable>
  );
}

function RelatedEntityChip({
  entry,
  onPress,
}: {
  entry: RelatedEntityEntry;
  onPress: () => void;
}) {
  const theme = useTheme();
  const relLabel = RELATIONSHIP_LABELS[entry.relationshipType];
  const parkLabel = entry.parkIds.map((p) => PARK_DISPLAY_NAMES[p] ?? p).join(", ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.relatedChip,
        {
          backgroundColor: pressed
            ? theme.colors.primaryContainer
            : theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={entry.accessibilityLabel}
      accessibilityHint="Double tap to view this entity's stories."
    >
      <Text
        variant="bodySmall"
        numberOfLines={1}
        style={[styles.relatedChipName, { color: theme.colors.onSurface }]}
      >
        {entry.entityName}
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
      >
        {relLabel}
        {parkLabel ? ` · ${parkLabel}` : ""}
      </Text>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function EntityProfileScreen({ route, navigation }: Props) {
  const { entityName } = route.params;
  const app = useAppContext();
  const theme = useTheme();

  const graph = useMemo(
    () => buildEntityGraph({ clusters: app.clusters, feedItems: app.items }),
    [app.clusters, app.items],
  );

  const profile = useMemo(
    () => getEntityProfile(entityName, graph, app.clusters),
    [entityName, graph, app.clusters],
  );

  if (!profile) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          No stories found for "{entityName}".
        </Text>
      </ScrollView>
    );
  }

  const parkLabel = profile.parkIds
    .map((p) => PARK_DISPLAY_NAMES[p] ?? p)
    .join(", ");

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      accessibilityLabel={profile.accessibilityLabel}
    >
      {/* Entity header */}
      <View
        style={styles.entityHeader}
        accessible
        accessibilityRole="header"
        accessibilityLabel={profile.accessibilityLabel}
      >
        <View
          style={[styles.entityIcon, { backgroundColor: theme.colors.primaryContainer }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <MaterialCommunityIcons
            name={"castle" as any}
            size={28}
            color={theme.colors.onPrimaryContainer}
          />
        </View>
        <View style={styles.entityHeaderText}>
          <Text
            variant="headlineSmall"
            style={[styles.entityName, { color: theme.colors.onSurface }]}
          >
            {profile.entityName}
          </Text>
          {parkLabel ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {parkLabel}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {profile.totalClusterCount} {profile.totalClusterCount === 1 ? "story" : "stories"}
          </Text>
        </View>
      </View>

      {/* Related entities */}
      {profile.relatedEntities.length > 0 ? (
        <>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
            accessibilityRole="header"
          >
            RELATED ENTITIES
          </Text>
          <View style={styles.relatedChipGrid}>
            {profile.relatedEntities.map((entry) => (
              <RelatedEntityChip
                key={entry.entityName}
                entry={entry}
                onPress={() =>
                  navigation.push("EntityProfile", { entityName: entry.entityName })
                }
              />
            ))}
          </View>
          <Divider style={styles.divider} />
        </>
      ) : null}

      {/* Recent coverage */}
      <Text
        variant="titleSmall"
        style={[styles.sectionTitle, { color: theme.colors.primary }]}
        accessibilityRole="header"
      >
        RECENT COVERAGE
      </Text>
      {profile.recentClusters.length === 0 ? (
        <Text
          variant="bodyMedium"
          style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
        >
          No recent stories.
        </Text>
      ) : (
        profile.recentClusters.map((cluster) => (
          <ClusterRow
            key={cluster.clusterId}
            cluster={cluster}
            onPress={() =>
              navigation.navigate("StoryDetail", { clusterId: cluster.clusterId })
            }
          />
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  entityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  entityIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  entityHeaderText: {
    flex: 1,
    gap: 2,
  },
  entityName: {
    fontWeight: "700",
    lineHeight: 28,
  },
  sectionTitle: {
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  relatedChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  relatedChip: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 180,
  },
  relatedChipName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  divider: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  clusterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  clusterBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  clusterHeadline: {
    fontWeight: "500",
    lineHeight: 20,
  },
  openButton: {
    alignSelf: "flex-start",
    marginTop: 2,
    marginLeft: -8,
  },
  emptyText: {
    paddingHorizontal: 16,
  },
});
