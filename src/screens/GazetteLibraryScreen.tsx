// Phase 05 (Gazette experience redesign) — "The Gazette Library": the full saved-items +
// followed-collections browse screen. Root For You now only teases a few recent items and
// sends users here via "Open the Gazette Library" rather than dumping everything on the root
// (temp/03_IMPLEMENTATION_PHASES/PHASE_05_FOR_YOU_AND_LIBRARY.md).
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { CollectionCard } from "../components/CollectionCard";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { useCollections } from "../hooks/useCollections";
import { searchFeedItems } from "../utils/search";
import type { FeedItem } from "../domain/models";
import type { ForYouStackParamList } from "../navigation/types";

import { buildAllCollections, buildAutoCollections } from "../intelligence/phase10";
import collectionsData from "../data/phase10/collections.json";
import type { CollectionDefinition } from "../intelligence/phase10/types";
import { isBackfillInProgress } from "../services/feedEngine";

type Props = NativeStackScreenProps<ForYouStackParamList, "GazetteLibrary">;

export function GazetteLibraryScreen({ navigation }: Props) {
  const app = useAppContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const sourceByID = useMemo(() => new Map(app.sources.map((s) => [s.id, s.name])), [app.sources]);

  const handleOpen = useCallback(
    (item: FeedItem) => navigation.navigate("FeedDetail", { item }),
    [navigation]
  );

  const visibleSaved = useMemo(
    () => searchFeedItems(app.savedItems, searchQuery),
    [app.savedItems, searchQuery]
  );

  const { savedCollectionIDs, toggleSaveCollection } = useCollections();
  const editorialDefinitions = collectionsData as CollectionDefinition[];

  const followedCollections = useMemo(() => {
    if (savedCollectionIDs.length === 0) return [];
    const editorialIds = new Set(editorialDefinitions.map((d) => d.id));
    const autoDefinitions = buildAutoCollections(app.clusters, editorialIds);
    const allDefinitions = [...editorialDefinitions, ...autoDefinitions];
    return buildAllCollections(app.clusters, allDefinitions, savedCollectionIDs).filter((c) => c.isSaved);
  }, [savedCollectionIDs, editorialDefinitions, app.clusters]);

  // Phase 06: a quiet, non-technical note — never a queue count or progress bar —
  // shown only while any enabled source still has room to grow toward its target.
  const backfillInProgress = useMemo(
    () => isBackfillInProgress(app.sources, app.sourceMeta),
    [app.sources, app.sourceMeta]
  );

  return (
    <Screen>
      <FlatList
        data={visibleSaved}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <PlainSearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("library.searchPlaceholder")}
              accessibilityLabel={t("library.searchPlaceholder")}
              accessibilityHint={t("library.searchHint")}
            />
            {followedCollections.length > 0 ? (
              <>
                <Text
                  variant="titleSmall"
                  style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
                  accessibilityRole="header"
                >
                  {t("library.myCollections")}
                </Text>
                <View style={styles.collectionGrid}>
                  {followedCollections.map((collection) => (
                    <CollectionCard
                      key={collection.definition.id}
                      collection={collection}
                      onPress={() => navigation.navigate("CollectionDetail", { collectionId: collection.definition.id })}
                      onToggleSave={() => toggleSaveCollection(collection.definition.id)}
                    />
                  ))}
                </View>
              </>
            ) : null}
            <Text
              variant="titleSmall"
              style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
              accessibilityRole="header"
            >
              {t("library.savedItems")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <FeedItemCard
            item={item}
            settings={app.settings}
            sourceName={sourceByID.get(item.sourceID) ?? t("detail.unknownWebsite")}
            onOpen={handleOpen}
            onToggleSaved={app.toggleSaved}
            onMarkUnread={app.markAsUnread}
            onMuteSource={app.muteSource}
          />
        )}
        ListEmptyComponent={
          followedCollections.length === 0 ? (
            <EmptyState title={t("library.emptyTitle")} body={t("library.emptyBody")} icon="bookmark-outline" />
          ) : null
        }
        ListFooterComponent={
          backfillInProgress ? (
            <Text
              style={[styles.growingNote, { color: theme.colors.onSurfaceVariant }]}
              accessibilityRole="text"
            >
              {t("library.growing")}
            </Text>
          ) : null
        }
        contentContainerStyle={visibleSaved.length === 0 ? styles.emptyList : styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    gap: 10,
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  collectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  growingNote: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
});
