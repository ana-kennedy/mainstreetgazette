// Phase 07 — "Gazette Library" Settings group. Distinct from the For You tab's
// GazetteLibraryScreen.tsx (the actual saved-items browse screen, built in Phase 05) —
// this is the *preferences* destination the spec calls for: My Collections (a shortcut
// into that browse screen), Ready Offline, Storage, and a plain-language explanation.
// Storage replaces the retired AppearanceStorageScreen's literal day-count picker and
// "Clear Article Cache" button — the spec explicitly says never show a cache-retention
// duration, and Phase 06 gave "Optimize Automatically" a real mechanism to point at.
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { NativeModules, Platform, ScrollView, StyleSheet } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { PrefGroup, PrefNavRow, PrefSectionLabel, PrefSwitchRow } from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";

export function GazetteLibrarySettingsScreen() {
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
          Gazette Library
        </Text>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Your saved Disney discoveries, thoughtfully organized in one place.
        </Text>

        <PrefGroup>
          <PrefNavRow
            label="My Collections"
            icon="folder-multiple-outline"
            hint="Double tap to browse your saved items and collections."
            onPress={() => {
              playConfirm();
              (navigation.getParent() as any)?.navigate("ForYou", { screen: "GazetteLibrary" });
            }}
          />
          <PrefNavRow
            label="Ready Offline"
            icon="cloud-off-outline"
            hint="Coming soon — offline downloads aren't available yet."
            onPress={() => {}}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Storage</PrefSectionLabel>
        <PrefGroup>
          <PrefSwitchRow
            title="Optimize Automatically"
            description={
              settings.optimizeStorageAutomatically
                ? "Recommended. Older items you haven't saved gradually simplify to save space — saved items are never touched."
                : "Turn on to let the Gazette gradually simplify older, unsaved items and save space."
            }
            value={settings.optimizeStorageAutomatically}
            onValueChange={(v) => update({ optimizeStorageAutomatically: v })}
          />
          {!settings.optimizeStorageAutomatically ? (
            <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
              Keep Everything Available is on — nothing you haven't saved will be simplified or removed based on age.
            </Text>
          ) : null}
          <PrefSwitchRow
            title="Only Grow Your Library on Wi-Fi"
            description="Wait for Wi-Fi before fetching additional history in the background. Your daily News refresh isn't affected."
            value={settings.growLibraryWifiOnly}
            onValueChange={(v) => update({ growLibraryWifiOnly: v })}
          />
        </PrefGroup>

        {Platform.OS === "ios" && !!NativeModules.MGCloudSync ? (
          <>
            <Divider style={styles.divider} />
            <PrefSectionLabel>iCloud Sync</PrefSectionLabel>
            <PrefGroup>
              <PrefSwitchRow
                title="Enable iCloud Sync"
                description="Sync saved articles, sources, settings, and playback across your devices."
                value={settings.iCloudSyncEnabled}
                onValueChange={(v) => update({ iCloudSyncEnabled: v })}
              />
              {settings.iCloudSyncEnabled ? (
                <>
                  <PrefSwitchRow title="Saved Articles" description="" value={settings.iCloudSyncSavedArticles} onValueChange={(v) => update({ iCloudSyncSavedArticles: v })} />
                  <PrefSwitchRow title="Sources" description="" value={settings.iCloudSyncSources} onValueChange={(v) => update({ iCloudSyncSources: v })} />
                  <PrefSwitchRow title="Settings" description="" value={settings.iCloudSyncSettings} onValueChange={(v) => update({ iCloudSyncSettings: v })} />
                  <PrefSwitchRow title="Playback Progress" description="" value={settings.iCloudSyncPlayback} onValueChange={(v) => update({ iCloudSyncPlayback: v })} />
                </>
              ) : null}
            </PrefGroup>
          </>
        ) : null}

        <Divider style={styles.divider} />
        <Text style={[styles.explanation, { color: theme.colors.onSurfaceVariant }]}>
          Your Gazette Library continues to grow as you explore — the more you read, watch, and
          listen to, the more it can find for you.
        </Text>
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
  explanation: {
    fontSize: 13,
    lineHeight: 18,
  },
});
