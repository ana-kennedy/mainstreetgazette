// Phase 74 — Accessibility Learning Center: curated a11y tips and how-tos.
// Phase 07: accepts an optional route param so Help & Support's three separate spec
// entries (VoiceOver Guide / Low Vision Guide / Braille and Keyboard Guide) and FAQ can
// each reuse this one screen/accordion pattern with a filtered article list and their
// own title, instead of three-plus newly-authored screens.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute, type RouteProp } from "@react-navigation/native";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { ACCESSIBILITY_GUIDE_IDS, FAQ_IDS, HELP_ARTICLES, type HelpArticle } from "../data/helpContent";
import type { SettingsStackParamList } from "../navigation/types";

type Route = RouteProp<SettingsStackParamList, "AccessibilityGuide">;

const QUICK_ACTIONS = [
  {
    id: "voiceover-level",
    icon: "format-list-bulleted",
    title: "Set VoiceOver detail level",
    description: "Your Gazette → Accessibility → Announcement Detail Level",
  },
  {
    id: "test-sounds",
    icon: "volume-high",
    title: "Test sounds",
    description: "Your Gazette → Reading Experience → Test Sounds",
  },
  {
    id: "enhanced-spacing",
    icon: "format-line-spacing",
    title: "Enable enhanced spacing",
    description: "Your Gazette → Accessibility → Vision → Enhanced Spacing",
  },
  {
    id: "high-contrast",
    icon: "contrast-circle",
    title: "Enable high contrast",
    description: "Your Gazette → Accessibility → Vision → High Visual Contrast",
  },
];

function resolveGuideParams(
  params: SettingsStackParamList["AccessibilityGuide"]
): { title: string; ids: string[]; intro: string; showQuickSettings: boolean } {
  switch (params?.section) {
    case "voiceover":
      return {
        title: "VoiceOver Guide",
        ids: ["a11y-voiceover"],
        intro: "How Main Street Gazette works with VoiceOver.",
        showQuickSettings: true,
      };
    case "lowVision":
      return {
        title: "Low Vision Guide",
        ids: ["a11y-large-text"],
        intro: "How Main Street Gazette supports large text and low vision settings.",
        showQuickSettings: true,
      };
    case "braille":
      return {
        title: "Braille and Keyboard Guide",
        ids: ["a11y-braille"],
        intro: "How Main Street Gazette works with braille displays.",
        showQuickSettings: false,
      };
    case "faq":
      return {
        title: "Frequently Asked Questions",
        ids: FAQ_IDS,
        intro: "Quick answers to common questions.",
        showQuickSettings: false,
      };
    default:
      return {
        title: "Accessibility Guide",
        ids: ACCESSIBILITY_GUIDE_IDS,
        intro: "Main Street Gazette is designed to be fully accessible. Here's how to get the most out of it.",
        showQuickSettings: true,
      };
  }
}

export function AccessibilityGuideScreen() {
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const route = useRoute<Route>();
  const { title, ids, intro, showQuickSettings } = resolveGuideParams(route.params);
  const guideArticles = HELP_ARTICLES.filter((a) => ids.includes(a.id));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text
          variant="headlineMedium"
          style={[styles.pageTitle, { color: theme.colors.onSurface }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {intro}
        </Text>

        {showQuickSettings ? (
          <>
            <Text
              variant="titleSmall"
              style={[styles.sectionHeader, { color: theme.colors.primary }]}
              accessibilityRole="header"
            >
              QUICK SETTINGS
            </Text>
            {QUICK_ACTIONS.map((qa) => (
              <View
                key={qa.id}
                style={[styles.quickCard, { backgroundColor: theme.colors.surfaceVariant }]}
                accessible
                accessibilityLabel={`${qa.title}. ${qa.description}`}
              >
                <MaterialCommunityIcons
                  name={qa.icon as any}
                  size={22}
                  color={theme.colors.primary}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                    {qa.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {qa.description}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null}

        <Text
          variant="titleSmall"
          style={[styles.sectionHeader, { color: theme.colors.primary }]}
          accessibilityRole="header"
        >
          LEARN MORE
        </Text>
        {guideArticles.map((article) => {
          const isExpanded = expandedId === article.id;
          return (
            <Pressable
              key={article.id}
              onPress={() => setExpandedId(isExpanded ? null : article.id)}
              style={({ pressed }) => [
                styles.accordionRow,
                {
                  backgroundColor: pressed || isExpanded ? theme.colors.primaryContainer : theme.colors.surface,
                  borderColor: isExpanded ? theme.colors.primary : theme.colors.outlineVariant,
                  borderWidth: isExpanded ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
              accessible
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={`${article.title}. ${isExpanded ? "Collapse" : "Expand"}.`}
            >
              <View style={styles.accordionHeader} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text variant="bodyLarge" style={[styles.accordionTitle, { color: theme.colors.onSurface }]} numberOfLines={isExpanded ? undefined : 1}>
                  {article.title}
                </Text>
                <MaterialCommunityIcons
                  name={(isExpanded ? "chevron-up" : "chevron-down") as any}
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
              {isExpanded ? (
                <Text
                  variant="bodyMedium"
                  style={[styles.accordionBody, { color: theme.colors.onSurface }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {article.body}
                </Text>
              ) : null}
            </Pressable>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 10,
    paddingBottom: 48,
  },
  pageTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionHeader: {
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 10,
    padding: 14,
  },
  accordionRow: {
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accordionTitle: {
    flex: 1,
    fontWeight: "600",
  },
  accordionBody: {
    lineHeight: 22,
  },
});
