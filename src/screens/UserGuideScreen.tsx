// Phase 67 — Built-In User Guide: searchable in-app help with section navigation.
// Phase 07: accepts an optional route param so Help & Support's "Learn the Gazette"
// entry can deep-link straight to a section instead of the top-level grid.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute, type RouteProp } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Searchbar, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import {
  HELP_ARTICLES,
  HELP_SECTION_LABELS,
  searchHelpContent,
  type HelpArticle,
  type HelpSection,
} from "../data/helpContent";
import type { SettingsStackParamList } from "../navigation/types";

type Route = RouteProp<SettingsStackParamList, "UserGuide">;

const SECTION_ICONS: Record<HelpSection, string> = {
  gettingStarted: "rocket-launch-outline",
  news: "newspaper-variant-outline",
  explore: "map-outline",
  collections: "folder-outline",
  sources: "rss",
  accessibility: "human",
  troubleshooting: "wrench-outline",
  privacy: "shield-lock-outline",
};

const ALL_SECTIONS = Object.keys(HELP_SECTION_LABELS) as HelpSection[];

function ArticleDetail({ article, onBack }: { article: HelpArticle; onBack: () => void }) {
  const theme = useTheme();
  return (
    <ScrollView
      contentContainerStyle={styles.detailContent}
      accessibilityLabel={article.title}
    >
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Back to user guide"
      >
        <MaterialCommunityIcons name={"arrow-left" as any} size={20} color={theme.colors.primary} />
        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
          User Guide
        </Text>
      </Pressable>
      <Text
        variant="headlineSmall"
        style={[styles.articleTitle, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        {article.title}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.articleSummary, { color: theme.colors.primary }]}
      >
        {article.summary}
      </Text>
      <Text
        variant="bodyLarge"
        style={[styles.articleBody, { color: theme.colors.onSurface }]}
      >
        {article.body}
      </Text>
    </ScrollView>
  );
}

export function UserGuideScreen() {
  const theme = useTheme();
  const route = useRoute<Route>();
  const [query, setQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<HelpSection | null>(route.params?.section ?? null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const displayedArticles = useMemo<HelpArticle[]>(() => {
    if (query.trim().length > 1) return searchHelpContent(query);
    if (selectedSection) return HELP_ARTICLES.filter((a) => a.section === selectedSection);
    return [];
  }, [query, selectedSection]);

  if (selectedArticle) {
    return (
      <Screen>
        <ArticleDetail
          article={selectedArticle}
          onBack={() => setSelectedArticle(null)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineMedium" style={[styles.pageTitle, { color: theme.colors.onSurface }]} accessibilityRole="header">
          User Guide
        </Text>
        <Searchbar
          placeholder="Search help..."
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          accessibilityLabel="Search help articles"
          accessibilityHint="Type to search the user guide."
        />

        {query.trim().length > 1 || selectedSection ? (
          // Search results or section articles
          <>
            {selectedSection && !query.trim() ? (
              <Pressable
                onPress={() => setSelectedSection(null)}
                style={styles.backBtn}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Back to all sections"
              >
                <MaterialCommunityIcons name={"arrow-left" as any} size={18} color={theme.colors.primary} />
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                  All Topics
                </Text>
              </Pressable>
            ) : null}
            {displayedArticles.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 32 }}>
                No results for "{query}"
              </Text>
            ) : (
              displayedArticles.map((article) => (
                <Pressable
                  key={article.id}
                  onPress={() => setSelectedArticle(article)}
                  style={({ pressed }) => [
                    styles.articleRow,
                    {
                      backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`${article.title}. ${article.summary}`}
                  accessibilityHint="Double tap to read this article."
                >
                  <View style={styles.articleRowText}>
                    <Text variant="bodyLarge" style={[styles.articleRowTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {article.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                      {article.summary}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name={"chevron-right" as any} size={18} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              ))
            )}
          </>
        ) : (
          // Section grid
          <View style={styles.sectionGrid}>
            {ALL_SECTIONS.map((section) => (
              <Pressable
                key={section}
                onPress={() => setSelectedSection(section)}
                style={({ pressed }) => [
                  styles.sectionCard,
                  {
                    backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                  },
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={HELP_SECTION_LABELS[section]}
                accessibilityHint="Double tap to browse this section."
              >
                <MaterialCommunityIcons
                  name={SECTION_ICONS[section] as any}
                  size={28}
                  color={theme.colors.primary}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text
                  variant="labelMedium"
                  style={[styles.sectionLabel, { color: theme.colors.onSurface }]}
                  numberOfLines={2}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {HELP_SECTION_LABELS[section]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  pageTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },
  search: {
    marginBottom: 4,
  },
  sectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sectionCard: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    alignItems: "flex-start",
  },
  sectionLabel: {
    fontWeight: "600",
    lineHeight: 18,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  articleRowText: {
    flex: 1,
    gap: 2,
  },
  articleRowTitle: {
    fontWeight: "600",
  },
  detailContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 48,
  },
  articleTitle: {
    fontWeight: "700",
    lineHeight: 28,
  },
  articleSummary: {
    fontWeight: "600",
    fontStyle: "italic",
  },
  articleBody: {
    lineHeight: 24,
  },
});
