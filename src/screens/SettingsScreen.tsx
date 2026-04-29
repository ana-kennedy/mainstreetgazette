import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, List, SegmentedButtons, Switch, Text } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";

export function SettingsScreen() {
  const app = useAppContext();
  const settings = app.settings;
  if (!settings) return null;

  const update = (patch: Partial<typeof settings>) => app.updateSettings({ ...settings, ...patch });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" accessibilityRole="header">
          Settings
        </Text>
        <Text variant="titleMedium" accessibilityRole="header">
          Appearance
        </Text>
        <List.Item
          title="Dark mode"
          description="Use a darker color theme throughout the app."
          right={() => (
            <Switch
              value={settings.darkModeEnabled}
              onValueChange={(value) => update({ darkModeEnabled: value })}
              accessibilityLabel="Dark mode"
              accessibilityRole="switch"
              accessibilityHint="Double tap to toggle dark mode."
            />
          )}
          accessibilityLabel={`Dark mode. ${settings.darkModeEnabled ? "On" : "Off"}. Use a darker color theme throughout the app.`}
        />
        <Divider />
        <Text variant="titleMedium" accessibilityRole="header">
          Feed
        </Text>
        <List.Item
          title="Auto refresh on launch"
          description="Fetch enabled feeds when the app starts."
          right={() => (
            <Switch
              value={settings.autoRefreshOnLaunch}
              onValueChange={(value) => update({ autoRefreshOnLaunch: value })}
              accessibilityLabel="Auto refresh on launch"
              accessibilityRole="switch"
              accessibilityHint="Double tap to toggle automatic feed refresh."
            />
          )}
          accessibilityLabel={`Auto refresh on launch. ${settings.autoRefreshOnLaunch ? "On" : "Off"}. Fetch enabled feeds when the app starts.`}
        />
        <List.Item
          title="Show only new items"
          description="Limit the news feed to checkpoint-new items."
          right={() => (
            <Switch
              value={settings.showOnlyNew}
              onValueChange={(value) => update({ showOnlyNew: value })}
              accessibilityLabel="Show only new items"
              accessibilityRole="switch"
              accessibilityHint="Double tap to toggle filtering to new items."
            />
          )}
          accessibilityLabel={`Show only new items. ${settings.showOnlyNew ? "On" : "Off"}.`}
        />
        <Text variant="bodyLarge">Sort order</Text>
        <SegmentedButtons
          value={settings.sortOrder}
          onValueChange={(value) => update({ sortOrder: value as typeof settings.sortOrder })}
          buttons={[
            { value: "newestFirst", label: "Newest", accessibilityLabel: "Sort newest first" },
            { value: "oldestFirst", label: "Oldest", accessibilityLabel: "Sort oldest first" }
          ]}
        />
        <Divider />
        <Text variant="titleMedium" accessibilityRole="header">
          Accessibility
        </Text>
        <List.Item
          title="Enhanced spacing"
          description="Adds more breathing room for low-vision layouts."
          right={() => (
            <Switch
              value={settings.lowVisionEnhancedSpacing}
              onValueChange={(value) => update({ lowVisionEnhancedSpacing: value })}
              accessibilityLabel="Enhanced spacing"
              accessibilityRole="switch"
              accessibilityHint="Double tap to toggle enhanced spacing."
            />
          )}
          accessibilityLabel={`Enhanced spacing. ${settings.lowVisionEnhancedSpacing ? "On" : "Off"}.`}
        />
        <List.Item
          title="Bold metadata"
          description="Makes source and time metadata easier to scan."
          right={() => (
            <Switch
              value={settings.lowVisionBoldMetadata}
              onValueChange={(value) => update({ lowVisionBoldMetadata: value })}
              accessibilityLabel="Bold metadata"
              accessibilityRole="switch"
              accessibilityHint="Double tap to toggle bold metadata."
            />
          )}
          accessibilityLabel={`Bold metadata. ${settings.lowVisionBoldMetadata ? "On" : "Off"}.`}
        />
        <List.Item
          title="Hide thumbnails"
          description="Reduces visual clutter in feed rows."
          right={() => (
            <Switch
              value={settings.hideThumbnailsForLowVision}
              onValueChange={(value) => update({ hideThumbnailsForLowVision: value })}
              accessibilityLabel="Hide thumbnails"
              accessibilityRole="switch"
              accessibilityHint="Double tap to hide or show feed thumbnails."
            />
          )}
          accessibilityLabel={`Hide thumbnails. ${settings.hideThumbnailsForLowVision ? "On" : "Off"}.`}
        />
        <Divider />
        <Text variant="titleMedium" accessibilityRole="header">
          Playback
        </Text>
        <Text variant="bodyLarge">Default speed</Text>
        <SegmentedButtons
          value={String(settings.playbackDefaultSpeed)}
          onValueChange={(value) => update({ playbackDefaultSpeed: Number(value) })}
          buttons={[
            { value: "0.75", label: "0.75x", accessibilityLabel: "Default speed 0.75 times" },
            { value: "1", label: "1x", accessibilityLabel: "Default speed 1 times" },
            { value: "1.25", label: "1.25x", accessibilityLabel: "Default speed 1.25 times" },
            { value: "1.5", label: "1.5x", accessibilityLabel: "Default speed 1.5 times" },
            { value: "2", label: "2x", accessibilityLabel: "Default speed 2 times" }
          ]}
        />
        <List.Item
          title="Auto play next episode"
          description="Continue through the podcast queue."
          right={() => (
            <Switch
              value={settings.autoPlayNextEpisode}
              onValueChange={(value) => update({ autoPlayNextEpisode: value })}
              accessibilityLabel="Auto play next episode"
              accessibilityRole="switch"
              accessibilityHint="Double tap to toggle automatic queue playback."
            />
          )}
          accessibilityLabel={`Auto play next episode. ${settings.autoPlayNextEpisode ? "On" : "Off"}.`}
        />
        <View style={styles.footer}>
          <Text variant="titleMedium" accessibilityRole="header">
            Privacy and Legal
          </Text>
          <Text variant="bodyMedium">
            Main Street Gazette stores feeds, saved items, source choices, settings, queue, and playback progress locally on this device.
          </Text>
          <Text variant="bodyMedium">
            The app fetches enabled RSS, YouTube, and podcast feeds directly from the listed source providers. It does not include accounts, ads, analytics, tracking, or in-app purchases.
          </Text>
          <Text variant="bodyMedium">
            Main Street Gazette is an independent feed reader and podcast player. It is not affiliated with, endorsed by, or sponsored by Disney or the listed publishers.
          </Text>
          <Text variant="bodyMedium">
            Before App Store submission, add hosted Privacy Policy and Support URLs in App Store Connect.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12
  },
  footer: {
    paddingVertical: 16
  }
});
