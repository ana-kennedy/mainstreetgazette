// Phase 07 — "Explore Disney" Settings group (new screen). Park Radio has no real
// feature behind it yet (confirmed nowhere in the codebase — this is the spec's most
// clearly net-new item), so it's shown as a disabled "coming soon" row rather than a
// toggle that controls nothing. Trip Companion is the same for now — Phase 08 owns
// building that feature and will come back to wire this row to a real destination.
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text as RNText, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { PrefChoiceLabel, PrefChoiceRow, PrefGroup, PrefNavRow, PrefSectionLabel } from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { ExploreOpeningView, WeatherUnitPreference } from "../domain/models";

export function ExploreDisneyPreferencesScreen() {
  const app = useAppContext();
  const navigation = useNavigation();
  const { playConfirm } = useSounds();
  const theme = useTheme();
  const settings = app.settings;

  if (!settings) return null;

  const update = (patch: Partial<typeof settings>) => {
    playConfirm();
    app.updateSettings({ ...settings, ...patch });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.pageTitle} accessibilityRole="header">
          Explore Disney
        </Text>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Personalize how park information and destinations appear.
        </Text>

        <PrefSectionLabel>Dashboard</PrefSectionLabel>
        <PrefGroup>
          <PrefChoiceLabel>Opens To</PrefChoiceLabel>
          <PrefChoiceRow<ExploreOpeningView>
            value={settings.exploreOpeningView}
            onValueChange={(v) => update({ exploreOpeningView: v })}
            options={[
              { value: "liveToday",     label: "Live Today",      accessibilityLabel: "Open to Live Today" },
              { value: "todaysGazette", label: "Today's Gazette",  accessibilityLabel: "Open to Today's Gazette" },
              { value: "planning",      label: "Planning",         accessibilityLabel: "Open to Planning" },
              { value: "parkRadio",     label: "Park Radio",       accessibilityLabel: "Open to Park Radio" },
              { value: "rememberLast",  label: "Remember Last",    accessibilityLabel: "Remember the last section you viewed" },
            ]}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Weather</PrefSectionLabel>
        <PrefGroup>
          <PrefChoiceLabel>Units</PrefChoiceLabel>
          <PrefChoiceRow<WeatherUnitPreference>
            value={settings.weatherUnit}
            onValueChange={(v) => update({ weatherUnit: v })}
            options={[
              { value: "auto",       label: "Follow iPhone", accessibilityLabel: "Follow iPhone region setting" },
              { value: "fahrenheit", label: "°F",            accessibilityLabel: "Fahrenheit" },
              { value: "celsius",    label: "°C",            accessibilityLabel: "Celsius" },
            ]}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Park Radio</PrefSectionLabel>
        <PrefGroup>
          <PrefNavRow
            label="Park Radio"
            icon="radio"
            hint="Double tap to open independent station links in the Discover tab."
            onPress={() => {
              playConfirm();
              (navigation.getParent() as any)?.navigate("Discover", { screen: "ParkRadio" });
            }}
          />
        </PrefGroup>
        <RNText style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          Park Radio never autoplays and opens official listening pages operated by independent stations.
        </RNText>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Trip Companion</PrefSectionLabel>
        <PrefGroup>
          <PrefNavRow
            label="Manage Your Trips"
            icon="bag-suitcase-outline"
            hint="Double tap to plan trips and manage reminders in the For You tab."
            onPress={() => {
              playConfirm();
              (navigation.getParent() as any)?.navigate("ForYou", { screen: "TripCompanion" });
            }}
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
  pageTitle: {
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  intro: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 8,
  },
  note: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});
