import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";
import { PlainSearchField } from "../components/PlainSearchField";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { Source } from "../domain/models";
import type { SourcesStackParamList } from "../navigation/types";
import { sourceAccessibilityHint, sourceAccessibilityLabel } from "../utils/accessibility";
import { sourceCategoryDisplayName, sourceTypeDisplayName, trustLabelDisplayName } from "../utils/formatting";
import { searchSources } from "../utils/search";

type Props = NativeStackScreenProps<SourcesStackParamList, "SourceManage">;

function SourceRow({ source, onToggle }: { source: Source; onToggle: (id: string) => void }) {
  const theme = useTheme();
  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: source.isEnabled }}
      accessibilityValue={{ text: source.isEnabled ? "On" : "Off" }}
      accessibilityLabel={sourceAccessibilityLabel(source)}
      accessibilityHint={sourceAccessibilityHint(source)}
      onPress={() => onToggle(source.id)}
      onAccessibilityTap={() => onToggle(source.id)}
    >
      <View style={styles.row}>
        <View style={styles.sourceText}>
          <Text variant="titleMedium">{source.name}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {sourceTypeDisplayName(source.sourceType)} · {trustLabelDisplayName(source.trustLabel)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {source.categoryTags.map(sourceCategoryDisplayName).join(", ")}
          </Text>
          {source.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{source.description}</Text>
          ) : null}
        </View>
        <Switch
          value={source.isEnabled}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </Pressable>
  );
}

export function SourceManageScreen({ navigation }: Props) {
  const app = useAppContext();
  const theme = useTheme();
  const { playConfirm } = useSounds();
  const enabledCount = app.sources.filter((s) => s.isEnabled).length;

  const sections = useMemo(() => {
    const filtered = searchSources(app.sources, app.searchQuery);
    const articles = filtered.filter((s) => s.sourceType === "rssArticle");
    const videos = filtered.filter((s) => s.sourceType === "youtubeChannel");
    const podcasts = filtered.filter((s) => s.sourceType === "podcastRSS");
    const social = filtered.filter((s) => s.sourceType === "redditFeed");
    const result: { title: string; data: Source[] }[] = [];
    if (articles.length > 0) result.push({ title: "Articles", data: articles });
    if (videos.length > 0) result.push({ title: "Videos", data: videos });
    if (podcasts.length > 0) result.push({ title: "Podcasts", data: podcasts });
    if (social.length > 0) result.push({ title: "Social", data: social });
    return result;
  }, [app.sources, app.searchQuery]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Double tap to return to Sources."
        >
          <Text style={[styles.backText, { color: theme.colors.primary }]}>← Sources</Text>
        </Pressable>
        <View accessible accessibilityRole="header" accessibilityLabel={`Manage Sources. ${enabledCount} of ${app.sources.length} sources enabled.`}>
          <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]} accessible={false}>
            Manage Sources
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} accessible={false}>
            {enabledCount} of {app.sources.length} enabled
          </Text>
        </View>
        <PlainSearchField
          value={app.searchQuery}
          onChangeText={app.setSearchQuery}
          placeholder="Search sources"
          accessibilityLabel="Search sources"
          accessibilityHint="Enter words to search source names, descriptions, and categories."
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(source) => source.id}
        renderItem={({ item }) => (
          <SourceRow
            source={item}
            onToggle={(id) => { playConfirm(); app.toggleSource(id); }}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text
            variant="titleSmall"
            style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    gap: 10
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    justifyContent: "center"
  },
  backText: {
    fontSize: 15,
    fontWeight: "500"
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  list: {
    paddingBottom: 24
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 6,
    textTransform: "uppercase",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8
  },
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  sourceText: {
    flex: 1,
    gap: 3
  }
});
