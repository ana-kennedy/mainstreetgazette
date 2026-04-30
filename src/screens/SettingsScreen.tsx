import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Switch, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";

const PRIVACY_POLICY_URL = "https://ana-kennedy.github.io/mainstreetgazette/privacy-policy/";
const SUPPORT_URL = "https://ana-kennedy.github.io/mainstreetgazette/support/";

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel: string;
}

function ChoiceRow<T extends string>({
  value,
  options,
  onValueChange
}: {
  value: T;
  options: ChoiceOption<T>[];
  onValueChange: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.choiceRow, { borderColor: theme.colors.outline }]} accessible={false}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.choiceButton,
              {
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.outline
              }
            ]}
            onPress={() => onValueChange(option.value)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ selected: isSelected }}
            accessibilityHint={isSelected ? "Currently selected." : "Double tap to select."}
          >
            <Text style={{ color: isSelected ? theme.colors.onPrimary : theme.colors.primary }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingSwitchRow({
  title,
  description,
  value,
  onValueChange
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      style={[styles.switchRow, { borderColor: theme.colors.outline }]}
      onPress={() => onValueChange(!value)}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityValue={{ text: value ? "On" : "Off" }}
      accessibilityLabel={`${title}. ${value ? "On" : "Off"}.`}
      accessibilityHint={`Double tap to turn ${value ? "off" : "on"}. ${description}`}
      onAccessibilityTap={() => onValueChange(!value)}
    >
      <View style={styles.switchText}>
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodyMedium">{description}</Text>
      </View>
      <Switch
        value={value}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

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
        <SettingSwitchRow
          title="Dark mode"
          description="Use a darker color theme throughout the app."
          value={settings.darkModeEnabled}
          onValueChange={(value) => update({ darkModeEnabled: value })}
        />
        <Divider />
        <Text variant="titleMedium" accessibilityRole="header">
          Feed
        </Text>
        <SettingSwitchRow
          title="Auto refresh on launch"
          description="Fetch enabled feeds when the app starts."
          value={settings.autoRefreshOnLaunch}
          onValueChange={(value) => update({ autoRefreshOnLaunch: value })}
        />
        <SettingSwitchRow
          title="Show only new items"
          description="Limit the news feed to checkpoint-new items."
          value={settings.showOnlyNew}
          onValueChange={(value) => update({ showOnlyNew: value })}
        />
        <Text variant="bodyLarge">Sort order</Text>
        <ChoiceRow
          value={settings.sortOrder}
          onValueChange={(value) => update({ sortOrder: value as typeof settings.sortOrder })}
          options={[
            { value: "newestFirst", label: "Newest", accessibilityLabel: "Sort newest first" },
            { value: "oldestFirst", label: "Oldest", accessibilityLabel: "Sort oldest first" }
          ]}
        />
        <Divider />
        <Text variant="titleMedium" accessibilityRole="header">
          Accessibility
        </Text>
        <SettingSwitchRow
          title="Enhanced spacing"
          description="Adds more breathing room for low-vision layouts."
          value={settings.lowVisionEnhancedSpacing}
          onValueChange={(value) => update({ lowVisionEnhancedSpacing: value })}
        />
        <SettingSwitchRow
          title="Bold metadata"
          description="Makes source and time metadata easier to scan."
          value={settings.lowVisionBoldMetadata}
          onValueChange={(value) => update({ lowVisionBoldMetadata: value })}
        />
        <SettingSwitchRow
          title="Hide thumbnails"
          description="Reduces visual clutter in feed rows."
          value={settings.hideThumbnailsForLowVision}
          onValueChange={(value) => update({ hideThumbnailsForLowVision: value })}
        />
        <Divider />
        <Text variant="titleMedium" accessibilityRole="header">
          Playback
        </Text>
        <Text variant="bodyLarge">Default speed</Text>
        <ChoiceRow
          value={String(settings.playbackDefaultSpeed)}
          onValueChange={(value) => update({ playbackDefaultSpeed: Number(value) })}
          options={[
            { value: "0.75", label: "0.75x", accessibilityLabel: "Default speed 0.75 times" },
            { value: "1", label: "1x", accessibilityLabel: "Default speed 1 times" },
            { value: "1.25", label: "1.25x", accessibilityLabel: "Default speed 1.25 times" },
            { value: "1.5", label: "1.5x", accessibilityLabel: "Default speed 1.5 times" },
            { value: "2", label: "2x", accessibilityLabel: "Default speed 2 times" }
          ]}
        />
        <SettingSwitchRow
          title="Auto play next episode"
          description="Continue through the podcast queue."
          value={settings.autoPlayNextEpisode}
          onValueChange={(value) => update({ autoPlayNextEpisode: value })}
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
          <Button
            mode="outlined"
            icon="open-in-new"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityLabel="Open Privacy Policy"
            accessibilityRole="button"
            accessibilityHint="Double tap to open the Main Street Gazette privacy policy in your browser."
          >
            Privacy Policy
          </Button>
          <Button
            mode="outlined"
            icon="lifebuoy"
            onPress={() => Linking.openURL(SUPPORT_URL)}
            accessibilityLabel="Open Support"
            accessibilityRole="button"
            accessibilityHint="Double tap to open the Main Street Gazette support page in your browser."
          >
            Support
          </Button>
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
  },
  switchRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12
  },
  switchText: {
    flex: 1,
    gap: 4
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: "hidden"
  },
  choiceButton: {
    minHeight: 48,
    minWidth: 96,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12
  }
});
