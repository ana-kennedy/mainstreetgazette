import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { openBrowserAsync } from "expo-web-browser";
import React, { useMemo } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { buildLiveCollection } from "../intelligence/phase10";
import type { CollectionCluster } from "../intelligence/phase10/types";
import collectionsData from "../data/phase10/collections.json";
import type { CollectionDefinition } from "../intelligence/phase10/types";
import { useCollections } from "../hooks/useCollections";
import type { DiscoverStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<DiscoverStackParamList, "CollectionDetail">;

function ClusterRow({
  cluster,
  onPress,
}: {
  cluster: CollectionCluster;
  onPress: () => void;
}) {
  const theme = useTheme();

  const mediaHint: string[] = [];
  if (cluster.videoCount > 0) mediaHint.push(`${cluster.videoCount} video${cluster.videoCount !== 1 ? "s" : ""}`);
  if (cluster.podcastCount > 0) mediaHint.push(`${cluster.podcastCount} podcast${cluster.podcastCount !== 1 ? "s" : ""}`);
  if (cluster.communityCount > 0) mediaHint.push(`${cluster.communityCount} community`);

  const a11yLabel = [
    cluster.isBreaking ? "Breaking." : null,
    cluster.isOfficial ? "Official." : null,
    cluster.headline,
    cluster.sourceName,
    mediaHint.join(", "),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.clusterRow,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Double tap to read this story."
    >
      <View style={styles.clusterMeta}>
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
        {cluster.sourceName ? (
          <Text variant="bodySmall" style={{ color: theme.colors.primary }} numberOfLines={1}>
            {cluster.sourceName}
            {cluster.sourceCount > 1 ? ` +${cluster.sourceCount - 1} more` : ""}
          </Text>
        ) : null}
      </View>
      <Text
        variant="titleSmall"
        numberOfLines={3}
        style={[styles.clusterHeadline, { color: theme.colors.onSurface }]}
      >
        {cluster.headline}
      </Text>
      {mediaHint.length > 0 ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {mediaHint.join(" · ")}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function CollectionScreen({ route, navigation }: Props) {
  const { collectionId } = route.params;
  const app = useAppContext();
  const theme = useTheme();
  const { isSaved, toggleSaveCollection } = useCollections();

  const definitions = collectionsData as CollectionDefinition[];
  const definition = definitions.find((d) => d.id === collectionId);

  const savedIDs = useMemo(() => (isSaved(collectionId) ? [collectionId] : []), [isSaved, collectionId]);

  const collection = useMemo(() => {
    if (!definition) return null;
    return buildLiveCollection(definition, app.clusters, savedIDs);
  }, [definition, app.clusters, savedIDs]);

  const itemByID = useMemo(
    () => new Map(app.items.map((i) => [i.id, i])),
    [app.items],
  );

  if (!collection || !definition) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text variant="bodyLarge">Collection not found.</Text>
          <Button onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </Screen>
    );
  }

  const icon = definition.icon ?? "folder-star";
  const saved = isSaved(collectionId);

  const handleClusterPress = (cluster: CollectionCluster) => {
    const feedItem = itemByID.get(cluster.primaryItemId);
    if (feedItem) {
      navigation.navigate("FeedDetail", { item: feedItem });
    } else {
      openBrowserAsync(cluster.primaryItemId).catch(() => {});
    }
  };

  const articles = collection.clusters.filter((c) => c.articleCount > 0 && c.videoCount === 0);
  const videos = collection.clusters.filter((c) => c.videoCount > 0);
  const podcasts = collection.clusters.filter((c) => c.podcastCount > 0);
  const community = collection.clusters.filter((c) => c.communityCount > 0 && c.articleCount === 0 && c.videoCount === 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Back"
          accessibilityRole="button"
          accessibilityHint="Double tap to go back."
        >
          Back
        </Button>
        {/* Collection header */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={36}
            color={theme.colors.onPrimaryContainer}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text
            variant="headlineSmall"
            style={[styles.collectionTitle, { color: theme.colors.onPrimaryContainer }]}
            accessibilityRole="header"
          >
            {definition.title}
          </Text>
          {definition.description ? (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85, marginTop: 4 }}
            >
              {definition.description}
            </Text>
          ) : null}
          <View style={styles.headerMeta}>
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>
              {collection.totalCount} {collection.totalCount === 1 ? "story" : "stories"}
              {collection.mediaBreakdown.videos > 0 ? ` · ${collection.mediaBreakdown.videos} videos` : ""}
              {collection.mediaBreakdown.podcasts > 0 ? ` · ${collection.mediaBreakdown.podcasts} podcasts` : ""}
            </Text>
            <Button
              mode={saved ? "contained" : "outlined"}
              onPress={() => toggleSaveCollection(collectionId)}
              style={styles.followBtn}
              labelStyle={{ fontSize: 13 }}
              accessibilityLabel={saved ? `Unfollow ${definition.title}` : `Follow ${definition.title}`}
              accessibilityHint={saved ? "Double tap to unfollow this collection." : "Double tap to follow and get updates."}
            >
              {saved ? "Following" : "Follow"}
            </Button>
          </View>
        </View>

        {/* Latest stories */}
        {articles.length > 0 ? (
          <>
            <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface }]} accessibilityRole="header">
              Latest Articles
            </Text>
            {articles.map((cluster) => (
              <ClusterRow key={cluster.clusterId} cluster={cluster} onPress={() => handleClusterPress(cluster)} />
            ))}
            <Divider style={{ marginVertical: 4 }} />
          </>
        ) : null}

        {/* Videos */}
        {videos.length > 0 ? (
          <>
            <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface }]} accessibilityRole="header">
              Videos
            </Text>
            {videos.map((cluster) => (
              <ClusterRow key={cluster.clusterId} cluster={cluster} onPress={() => handleClusterPress(cluster)} />
            ))}
            <Divider style={{ marginVertical: 4 }} />
          </>
        ) : null}

        {/* Podcasts */}
        {podcasts.length > 0 ? (
          <>
            <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface }]} accessibilityRole="header">
              Podcasts
            </Text>
            {podcasts.map((cluster) => (
              <ClusterRow key={cluster.clusterId} cluster={cluster} onPress={() => handleClusterPress(cluster)} />
            ))}
            <Divider style={{ marginVertical: 4 }} />
          </>
        ) : null}

        {/* Community */}
        {community.length > 0 ? (
          <>
            <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onSurface }]} accessibilityRole="header">
              Community
            </Text>
            {community.map((cluster) => (
              <ClusterRow key={cluster.clusterId} cluster={cluster} onPress={() => handleClusterPress(cluster)} />
            ))}
          </>
        ) : null}

        {collection.clusters.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No stories yet. Check back soon.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: 8,
    marginTop: 8,
  },
  headerCard: {
    padding: 20,
    margin: 16,
    borderRadius: 16,
    gap: 4,
  },
  collectionTitle: {
    fontWeight: "700",
    marginTop: 8,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  followBtn: {
    borderRadius: 20,
  },
  sectionLabel: {
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  clusterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  clusterMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  clusterHeadline: {
    fontWeight: "500",
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
});
