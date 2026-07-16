import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const enabledCount = app.sources.filter((s) => s.isEnabled).length;

  const sections = useMemo(() => {
    const filtered = searchSources(app.sources, app.searchQuery);
    const rssArticles = filtered.filter((s) => s.sourceType === "rssArticle");
    const articles = rssArticles.filter((s) => !s.categoryTags.includes("international"));
    const international = rssArticles.filter((s) => s.categoryTags.includes("international"));
    const videos = filtered.filter((s) => s.sourceType === "youtubeChannel");
    const podcasts = filtered.filter((s) => s.sourceType === "podcastRSS");
    const social = filtered.filter((s) => s.sourceType === "redditFeed");
    const result: { title: string; data: Source[] }[] = [];
    if (articles.length > 0) result.push({ title: t("sources.section.articles"), data: articles });
    if (international.length > 0) result.push({ title: t("sources.section.international"), data: international });
    if (videos.length > 0) result.push({ title: t("sources.section.videos"), data: videos });
    if (podcasts.length > 0) result.push({ title: t("sources.section.podcasts"), data: podcasts });
    if (social.length > 0) result.push({ title: t("sources.section.social"), data: social });
    return result;
  }, [app.sources, app.searchQuery, t]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          accessibilityHint={t("common.back")}
        >
          <Text style={[styles.backText, { color: theme.colors.primary }]}>← {t("sources.title")}</Text>
        </Pressable>
        <View accessible accessibilityRole="header" accessibilityLabel={t("screens.manageSources")}>
          <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]} accessible={false}>
            {t("screens.manageSources")}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} accessible={false}>
            {enabledCount} / {app.sources.length}
          </Text>
        </View>
        <PlainSearchField
          value={app.searchQuery}
          onChangeText={app.setSearchQuery}
          placeholder={t("sources.searchPlaceholder")}
          accessibilityLabel={t("sources.searchA11y")}
          accessibilityHint={t("sources.searchHint")}
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
