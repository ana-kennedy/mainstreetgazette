// Phase 07 — "My Magic" (rebuild of the legacy PersonalizationScreen). Reuses
// PersonalizationContext's existing favoriteLocations/favoriteTopics arrays — no new
// data layer — remapped to the spec's fixed Destinations + Interests taxonomy
// (temp/04_SCREEN_SPECIFICATIONS/SETTINGS_SPEC.md, section 1). Media type is
// deliberately not a filter here; the old "Default News Feed" mode moved to
// NewsPreferencesScreen and Notification Profile/Behavior moved to GazetteAlertsScreen.
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Screen } from "../components/Screen";
import { PrefGroup, PrefSectionLabel, PrefMultiChoiceRow, PrefSwitchRow } from "../components/PreferenceComponents";
import { PARK_OPTIONS } from "./NewsPreferencesScreen";
import { usePersonalization } from "../context/PersonalizationContext";
import { useSounds } from "../context/SoundContext";
import type { ParkFilterKey } from "../domain/models";
import topicTaxonomyData from "../assets/data/knowledge/topic_taxonomy_v1.json";

interface TopicDefinition {
  id: string;
  name: string;
}

const ALL_TOPIC_OPTIONS = (topicTaxonomyData.topics as TopicDefinition[]).map((topic) => ({
  value: topic.id,
  label: topic.name,
  accessibilityLabel: topic.name,
}));

// Exported so the Phase 09 Startup Wizard's My Magic page can reuse the exact same
// taxonomy rather than a second, drifting copy.
export const DESTINATION_IDS = ["wdw", "dlr", "dcl", "international", "entertainment"] as const;

// The spec's fixed 11-interest taxonomy — a subset of the full content-classification
// topic list in topic_taxonomy_v1.json (that fuller list also drives "Hide From
// Favorites" below, since muting other classifications like "Rumor" is still useful).
export const INTEREST_IDS = [
  "attractions",
  "dining",
  "festivals_seasonal",
  "resort_hotel",
  "merchandise",
  "rundisney",
  "dvc",
  "accessibility",
  "disney_history",
  "official_announcement",
  "community_highlights",
] as const;

const FAVORITE_PARK_OPTIONS = PARK_OPTIONS.filter((option) => option.value !== "all") as Array<{
  value: ParkFilterKey;
  label: string;
  accessibilityLabel: string;
}>;

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function MyMagicScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePersonalization();
  const { playConfirm } = useSounds();
  const navigation = useNavigation();

  const destinationOptions = DESTINATION_IDS.map((id) => ({
    value: id,
    label: t(`myMagic.destination.${id}`),
    accessibilityLabel: t(`myMagic.destination.${id}`),
  }));

  const interestOptions = INTEREST_IDS.map((id) => ({
    value: id,
    label: t(`myMagic.interest.${id}`),
    accessibilityLabel: t(`myMagic.interest.${id}`),
  }));

  function toggleDestination(id: string) {
    playConfirm();
    updatePrefs({ favoriteLocations: toggleInArray(prefs.favoriteLocations, id) });
  }

  function toggleFavoritePark(park: ParkFilterKey) {
    playConfirm();
    updatePrefs({ favoriteParks: toggleInArray(prefs.favoriteParks, park) });
  }

  function toggleInterest(id: string) {
    playConfirm();
    updatePrefs({ favoriteTopics: toggleInArray(prefs.favoriteTopics, id) });
  }

  function toggleMutedTopic(id: string) {
    playConfirm();
    updatePrefs({ mutedTopics: toggleInArray(prefs.mutedTopics, id) });
  }

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

        <Text variant="headlineMedium" style={styles.pageTitle} accessibilityRole="header">
          {t("myMagic.title")}
        </Text>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>{t("myMagic.intro")}</Text>

        <PrefSectionLabel>{t("myMagic.destinations")}</PrefSectionLabel>
        <Text style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
          {t("myMagic.destinationsDesc")}
        </Text>
        <PrefGroup>
          <PrefMultiChoiceRow<string>
            values={prefs.favoriteLocations}
            options={destinationOptions}
            onToggle={toggleDestination}
          />
          <Text style={[styles.subLabel, { color: theme.colors.onSurface }]}>{t("myMagic.parks")}</Text>
          <PrefMultiChoiceRow<ParkFilterKey>
            values={prefs.favoriteParks as ParkFilterKey[]}
            options={FAVORITE_PARK_OPTIONS}
            onToggle={toggleFavoritePark}
          />
        </PrefGroup>

        <PrefSectionLabel>{t("myMagic.interests")}</PrefSectionLabel>
        <Text style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
          {t("myMagic.interestsDesc")}
        </Text>
        <PrefGroup>
          <PrefMultiChoiceRow<string>
            values={prefs.favoriteTopics}
            options={interestOptions}
            onToggle={toggleInterest}
          />
        </PrefGroup>

        <PrefSectionLabel>{t("personalization.section.hideFromFavorites")}</PrefSectionLabel>
        <Text style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
          {t("personalization.section.hideFromFavoritesDesc")}
        </Text>
        <PrefGroup>
          <PrefMultiChoiceRow<string>
            values={prefs.mutedTopics}
            options={ALL_TOPIC_OPTIONS}
            onToggle={toggleMutedTopic}
          />
        </PrefGroup>

        <PrefGroup>
          <PrefSwitchRow
            title={t("personalization.whyRecommended")}
            description={t("personalization.whyRecommendedDesc")}
            value={prefs.accessibility.announceWhyRecommended}
            onValueChange={(v) => {
              playConfirm();
              updatePrefs({ accessibility: { ...prefs.accessibility, announceWhyRecommended: v } });
            }}
          />
        </PrefGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  pageTitle: {
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  intro: {
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 4,
    marginTop: 8,
  },
});
