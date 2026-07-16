// Phase 07 — "Reading Experience" (new screen under Your Experience). Consolidates
// theme (from the retired AppearanceStorageScreen), card/artwork density, and reader/
// playback/sound behavior (from the retired SourceMediaPreferencesScreen and the sound
// half of AccessibilityPreferencesScreen) into the one spec-named destination:
// "System/light/dark, text override only if needed, standard/spacious/compact cards,
// full/reduced/text-first artwork, Gazette Reader behavior, seasonal touches, motion,
// sound." Text-size override, seasonal touches, and a standalone motion toggle are
// deliberately NOT included — see PHASE_07_RESULTS.md for why (no real consumer to wire
// them to honestly).
import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { PrefChoiceLabel, PrefChoiceRow, PrefGroup, PrefSectionLabel, PrefSwitchRow } from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import { useHaptics } from "../hooks/useHaptics";
import type { ArticleOpenMode, ArtworkDensity, CardDensity, ColorTheme, VideoOpenMode } from "../domain/models";

const THEME_OPTIONS: Array<{ value: ColorTheme; label: string; subtitle: string; icon: string }> = [
  { value: "system",   label: "Auto",      subtitle: "Follows iOS",    icon: "brightness-auto" },
  { value: "light",    label: "Light",     subtitle: "Always light",   icon: "white-balance-sunny" },
  { value: "dark",     label: "Dark",      subtitle: "Always dark",    icon: "moon-waxing-crescent" },
  { value: "gazette",  label: "Gazette",   subtitle: "Warm newspaper", icon: "newspaper-variant" },
  { value: "midnight", label: "Midnight",  subtitle: "Deep blue",      icon: "star-four-points" },
  { value: "fantasy",  label: "Fantasy",   subtitle: "Purple magic",   icon: "auto-fix" },
];

function ThemeGrid({ value, onValueChange }: { value: ColorTheme; onValueChange: (v: ColorTheme) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.themeGrid}>
      {THEME_OPTIONS.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onValueChange(opt.value)}
            style={[
              styles.themeCard,
              {
                backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
              },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${opt.label} theme. ${opt.subtitle}.`}
            accessibilityState={{ selected: isSelected }}
            accessibilityHint={isSelected ? "Currently selected." : "Double tap to apply this theme."}
          >
            <MaterialCommunityIcons
              name={opt.icon as any}
              size={22}
              color={isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={[styles.themeLabel, { color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {opt.label}
            </Text>
            <Text style={[styles.themeSub, { color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {opt.subtitle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SOUND_TESTS: Array<{ key: string; label: string; icon: string; play: (sounds: ReturnType<typeof useSounds>) => void }> = [
  { key: "confirm", label: "Navigation",   icon: "arrow-right-circle-outline", play: (s) => s.playConfirm() },
  { key: "select",  label: "Select",        icon: "cursor-default-click-outline", play: (s) => s.playSelect() },
  { key: "save",    label: "Save Article",  icon: "bookmark-outline",           play: (s) => s.playSave() },
  { key: "unsave",  label: "Remove Saved",  icon: "bookmark-remove-outline",    play: (s) => s.playUnsave() },
  { key: "refresh", label: "Refresh Done",  icon: "check-circle-outline",       play: (s) => s.playRefreshComplete() },
  { key: "error",   label: "Error",         icon: "alert-circle-outline",       play: (s) => s.playError() },
];

function SoundTestPanel({ sounds, haptics }: { sounds: ReturnType<typeof useSounds>; haptics: ReturnType<typeof useHaptics> }) {
  const theme = useTheme();
  return (
    <View style={testStyles.grid}>
      {SOUND_TESTS.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => { item.play(sounds); haptics.light(); }}
          style={({ pressed }) => [
            testStyles.btn,
            { backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.surfaceVariant, borderColor: theme.colors.outline },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Test ${item.label} sound`}
          accessibilityHint="Double tap to play this sound."
        >
          <MaterialCommunityIcons name={item.icon as any} size={22} color={theme.colors.onSurfaceVariant} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={[testStyles.btnLabel, { color: theme.colors.onSurfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ReadingExperienceScreen() {
  const app = useAppContext();
  const sounds = useSounds();
  const { playConfirm } = sounds;
  const haptics = useHaptics();
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
          Reading Experience
        </Text>

        <PrefSectionLabel>Theme</PrefSectionLabel>
        <ThemeGrid value={settings.colorTheme} onValueChange={(v) => update({ colorTheme: v })} />

        <Divider style={styles.divider} />

        <PrefSectionLabel>Card Appearance</PrefSectionLabel>
        <PrefGroup>
          <PrefChoiceLabel>Card Density</PrefChoiceLabel>
          <PrefChoiceRow<CardDensity>
            value={settings.cardDensity}
            onValueChange={(v) => update({ cardDensity: v })}
            options={[
              { value: "standard", label: "Standard", accessibilityLabel: "Standard card density" },
              { value: "spacious", label: "Spacious", accessibilityLabel: "Spacious card density" },
              { value: "compact",  label: "Compact",  accessibilityLabel: "Compact card density" },
            ]}
          />
          <PrefChoiceLabel>Artwork</PrefChoiceLabel>
          <PrefChoiceRow<ArtworkDensity>
            value={settings.artworkDensity}
            onValueChange={(v) => update({ artworkDensity: v })}
            options={[
              { value: "full",     label: "Full",       accessibilityLabel: "Full artwork" },
              { value: "reduced",  label: "Reduced",    accessibilityLabel: "Reduced artwork" },
              { value: "textFirst", label: "Text First", accessibilityLabel: "Text first, no artwork" },
            ]}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Gazette Reader</PrefSectionLabel>
        <PrefGroup>
          <PrefChoiceLabel>Open Articles In</PrefChoiceLabel>
          <PrefChoiceRow<ArticleOpenMode>
            value={settings.openArticlesIn}
            onValueChange={(v) => update({ openArticlesIn: v })}
            options={[
              { value: "inAppBrowser", label: "In-app", accessibilityLabel: "Open articles in the in-app browser" },
              { value: "safari",       label: "Safari",  accessibilityLabel: "Open articles in Safari" },
            ]}
          />
          {Platform.OS === "ios" ? (
            <PrefSwitchRow
              title="Reader Mode"
              description="Use Safari Reader view when available for a cleaner reading experience."
              value={settings.preferReaderMode}
              onValueChange={(v) => update({ preferReaderMode: v })}
            />
          ) : null}
          <PrefChoiceLabel>Open Videos In</PrefChoiceLabel>
          <PrefChoiceRow<VideoOpenMode>
            value={settings.openVideosIn}
            onValueChange={(v) => update({ openVideosIn: v })}
            options={[
              { value: "inAppBrowser", label: "In-app",  accessibilityLabel: "Open videos in the in-app player" },
              { value: "safari",       label: "Safari",  accessibilityLabel: "Open videos in Safari" },
              { value: "youtubeApp",   label: "YouTube", accessibilityLabel: "Open videos in the YouTube app" },
            ]}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Playback</PrefSectionLabel>
        <PrefGroup>
          <PrefChoiceLabel>Default Playback Speed</PrefChoiceLabel>
          <PrefChoiceRow<string>
            value={String(settings.playbackDefaultSpeed)}
            onValueChange={(v) => update({ playbackDefaultSpeed: Number(v) })}
            options={[
              { value: "0.75", label: "0.75×", accessibilityLabel: "0.75 times speed" },
              { value: "1",    label: "1×",    accessibilityLabel: "Normal speed" },
              { value: "1.25", label: "1.25×", accessibilityLabel: "1.25 times speed" },
              { value: "1.5",  label: "1.5×",  accessibilityLabel: "1.5 times speed" },
              { value: "2",    label: "2×",    accessibilityLabel: "2 times speed" },
            ]}
          />
          <PrefChoiceLabel>Skip Interval</PrefChoiceLabel>
          <PrefChoiceRow<string>
            value={String(settings.skipIntervalSeconds)}
            onValueChange={(v) => update({ skipIntervalSeconds: Number(v) })}
            options={[
              { value: "10", label: "10 s", accessibilityLabel: "10 second skip" },
              { value: "15", label: "15 s", accessibilityLabel: "15 second skip" },
              { value: "30", label: "30 s", accessibilityLabel: "30 second skip" },
              { value: "60", label: "60 s", accessibilityLabel: "60 second skip" },
            ]}
          />
          <PrefSwitchRow
            title="Auto-Play Next Episode"
            description="Automatically play the next podcast episode when the current one ends."
            value={settings.autoPlayNextEpisode}
            onValueChange={(v) => update({ autoPlayNextEpisode: v })}
          />
          <PrefSwitchRow
            title="Prefer Streaming"
            description="Stream audio instead of downloading when possible."
            value={settings.preferStreamingOverDownload}
            onValueChange={(v) => update({ preferStreamingOverDownload: v })}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Sound</PrefSectionLabel>
        <PrefGroup>
          <PrefSwitchRow
            title="Sound Effects"
            description="Play sounds for app actions like refresh, save, and navigation."
            value={settings.soundEffectsEnabled}
            onValueChange={(v) => update({ soundEffectsEnabled: v })}
          />
          <PrefSwitchRow
            title="Haptic Feedback"
            description="Vibrate on key interactions for tactile confirmation."
            value={settings.hapticsEnabled}
            onValueChange={(v) => update({ hapticsEnabled: v })}
          />
        </PrefGroup>

        {settings.soundEffectsEnabled ? (
          <>
            <PrefSectionLabel>Test Sounds</PrefSectionLabel>
            <SoundTestPanel sounds={sounds} haptics={haptics} />
          </>
        ) : null}

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
  divider: {
    marginVertical: 8,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeCard: {
    width: "47%",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    minHeight: 90,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  themeSub: {
    fontSize: 12,
    lineHeight: 16,
  },
});

const testStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  btn: {
    width: "30%",
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
    minHeight: 72,
    justifyContent: "center",
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
