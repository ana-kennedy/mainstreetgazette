import React from "react";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import {
  PrefChoiceLabel,
  PrefChoiceRow,
  PrefGroup,
  PrefSectionLabel,
  PrefSwitchRow,
} from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import { usePersonalization } from "../context/PersonalizationContext";
import type { NewsFeedMode } from "../personalization/personalizationTypes";
import type {
  ContentType,
  LocationFilterKey,
  ParkFilterKey,
  SortOrder,
  TimelineWindow,
} from "../domain/models";

// Moved here from the old PersonalizationScreen (now MyMagicScreen) — per the Phase 07
// spec, media type is "not an interest filter" and belongs with feed display behavior,
// not with My Magic's Destinations/Interests.
const FEED_MODES: NewsFeedMode[] = ["all", "official", "articles", "videos", "podcasts", "community"];

export const PARK_OPTIONS: Array<{ value: ParkFilterKey; label: string; accessibilityLabel: string }> = [
  { value: "all",                      label: "All",     accessibilityLabel: "All parks" },
  { value: "magic_kingdom",            label: "MK",      accessibilityLabel: "Magic Kingdom" },
  { value: "epcot",                    label: "EPCOT",   accessibilityLabel: "EPCOT" },
  { value: "hollywood_studios",        label: "HS",      accessibilityLabel: "Hollywood Studios" },
  { value: "animal_kingdom",           label: "AK",      accessibilityLabel: "Animal Kingdom" },
  { value: "disneyland",               label: "DL",      accessibilityLabel: "Disneyland" },
  { value: "california_adventure",     label: "DCA",     accessibilityLabel: "Disney California Adventure" },
  { value: "disneyland_paris",         label: "DLP",     accessibilityLabel: "Disneyland Paris" },
  { value: "tokyo_disneyland",         label: "TDL",     accessibilityLabel: "Tokyo Disneyland" },
  { value: "tokyo_disneysea",          label: "TDS",     accessibilityLabel: "Tokyo DisneySea" },
  { value: "shanghai_disneyland",      label: "SDL",     accessibilityLabel: "Shanghai Disneyland" },
  { value: "hong_kong_disneyland",     label: "HKDL",    accessibilityLabel: "Hong Kong Disneyland" },
];

export function NewsPreferencesScreen() {
  const app = useAppContext();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { playConfirm } = useSounds();
  const { prefs: personalizationPrefs, setNewsFeedMode } = usePersonalization();
  const settings = app.settings;

  if (!settings) return null;

  const update = (patch: Partial<typeof settings>) => {
    playConfirm();
    app.updateSettings({ ...settings, ...patch });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => (navigation.getParent() as any)?.navigate("News")}
          style={styles.backButton}
          accessibilityLabel="Back to News"
          accessibilityRole="button"
          accessibilityHint="Double tap to go back to the News tab."
        >
          Back
        </Button>
        <Text
          variant="headlineMedium"
          style={styles.pageTitle}
          accessibilityRole="header"
        >
          News & Timeline
        </Text>

        <PrefSectionLabel>{t("personalization.section.feedMode")}</PrefSectionLabel>
        <Text style={styles.sectionDesc}>{t("personalization.section.feedModeDesc")}</Text>
        <PrefGroup>
          <PrefChoiceRow<NewsFeedMode>
            value={personalizationPrefs.newsFeedMode}
            onValueChange={(v) => {
              playConfirm();
              setNewsFeedMode(v);
            }}
            options={FEED_MODES.map((mode) => ({
              value: mode,
              label: t(`personalization.feedMode.${mode}`),
              accessibilityLabel: t(`personalization.feedMode.${mode}`),
            }))}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Sort & Filter</PrefSectionLabel>
        <PrefGroup>
          <PrefChoiceLabel>Sort Order</PrefChoiceLabel>
          <PrefChoiceRow<SortOrder>
            value={settings.sortOrder}
            onValueChange={(v) => update({ sortOrder: v })}
            options={[
              { value: "newestFirst", label: "Newest first", accessibilityLabel: "Newest first" },
              { value: "oldestFirst", label: "Oldest first", accessibilityLabel: "Oldest first" },
            ]}
          />
          <PrefChoiceLabel>Park Filter</PrefChoiceLabel>
          <PrefChoiceRow<ParkFilterKey>
            value={settings.parkFilter}
            onValueChange={(v) => update({ parkFilter: v })}
            options={PARK_OPTIONS}
          />
          <PrefChoiceLabel>Location Filter</PrefChoiceLabel>
          <PrefChoiceRow<LocationFilterKey>
            value={settings.locationFilter}
            onValueChange={(v) => update({ locationFilter: v })}
            options={[
              { value: "all",           label: "All",           accessibilityLabel: "All locations" },
              { value: "wdw",           label: "WDW",           accessibilityLabel: "Walt Disney World" },
              { value: "dlr",           label: "DLR",           accessibilityLabel: "Disneyland Resort" },
              { value: "dcl",           label: "DCL",           accessibilityLabel: "Disney Cruise Line" },
              { value: "international", label: "Intl",          accessibilityLabel: "International parks" },
            ]}
          />
          <PrefChoiceLabel>Time Window</PrefChoiceLabel>
          <PrefChoiceRow<TimelineWindow>
            value={settings.timelineWindow}
            onValueChange={(v) => update({ timelineWindow: v })}
            options={[
              { value: "all",         label: "All",     accessibilityLabel: "All time" },
              { value: "now",         label: "Now",     accessibilityLabel: "Right now" },
              { value: "today",       label: "Today",   accessibilityLabel: "Today" },
              { value: "last_3_days", label: "3 days",  accessibilityLabel: "Last 3 days" },
              { value: "week",        label: "Week",    accessibilityLabel: "Last week" },
              { value: "month",       label: "Month",   accessibilityLabel: "Last month" },
            ]}
          />
          <PrefChoiceLabel>Content Type Filter</PrefChoiceLabel>
          <PrefChoiceRow<"all" | ContentType | "social">
            value={settings.timelineContentFilter}
            onValueChange={(v) => update({ timelineContentFilter: v })}
            options={[
              { value: "all",       label: "All",       accessibilityLabel: "All content types" },
              { value: "article",   label: "Articles",  accessibilityLabel: "Articles only" },
              { value: "video",     label: "Videos",    accessibilityLabel: "Videos only" },
              { value: "podcast",   label: "Podcasts",  accessibilityLabel: "Podcasts only" },
              { value: "community", label: "Community", accessibilityLabel: "Community posts only" },
            ]}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Feed Behaviour</PrefSectionLabel>
        <PrefGroup>
          <PrefSwitchRow
            title="Show Only Unread"
            description="Hide articles you have already read."
            value={settings.showOnlyNew}
            onValueChange={(v) => update({ showOnlyNew: v })}
          />
          <PrefSwitchRow
            title="New Since Last Visit"
            description="Show only articles published since you last opened the app."
            value={settings.showSinceLastVisit}
            onValueChange={(v) => update({ showSinceLastVisit: v })}
          />
          <PrefSwitchRow
            title="Group Stories"
            description="Merge articles about the same story into a single cluster."
            value={settings.groupStoriesEnabled}
            onValueChange={(v) => update({ groupStoriesEnabled: v })}
          />
          {settings.groupStoriesEnabled ? (
            <PrefSwitchRow
              title="Official Disney Only"
              description="Show only official Disney sources in the News feed."
              value={personalizationPrefs.newsFeedMode === "official"}
              onValueChange={(v) => {
                playConfirm();
                setNewsFeedMode(v ? "official" : "all");
              }}
            />
          ) : null}
          <PrefSwitchRow
            title="Auto-Refresh on Launch"
            description="Fetch new articles when you open the app."
            value={settings.autoRefreshOnLaunch}
            onValueChange={(v) => update({ autoRefreshOnLaunch: v })}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Card Appearance</PrefSectionLabel>
        <PrefGroup>
          <PrefChoiceLabel>Article Preview Lines</PrefChoiceLabel>
          <PrefChoiceRow<string>
            value={String(settings.previewLength)}
            onValueChange={(v) => update({ previewLength: Number(v) })}
            options={[
              { value: "1", label: "1",    accessibilityLabel: "1 line preview" },
              { value: "2", label: "2",    accessibilityLabel: "2 lines preview" },
              { value: "3", label: "3",    accessibilityLabel: "3 lines preview" },
              { value: "4", label: "4",    accessibilityLabel: "4 lines preview" },
              { value: "5", label: "5",    accessibilityLabel: "5 lines preview" },
              { value: "0", label: "Full", accessibilityLabel: "Full text preview" },
            ]}
          />
          <PrefChoiceLabel>Timeline Density</PrefChoiceLabel>
          <PrefChoiceRow<"full" | "minimal">
            value={settings.timelineDisplayMode}
            onValueChange={(v) => update({ timelineDisplayMode: v })}
            options={[
              { value: "full",    label: "Full",    accessibilityLabel: "Full card density" },
              { value: "minimal", label: "Minimal", accessibilityLabel: "Minimal card density" },
            ]}
          />
        </PrefGroup>

        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  pageTitle: {
    marginTop: -4,
  },
  divider: {
    marginVertical: 8,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
});
