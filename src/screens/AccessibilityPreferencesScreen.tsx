import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import {
  PrefChoiceLabel,
  PrefGroup,
  PrefSectionLabel,
  PrefSwitchRow,
} from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { AnnouncementLevel } from "../domain/models";

// ── AnnouncementLevelPicker (moved from SettingsScreen) ──────────────────────

const ANNOUNCEMENT_LEVELS = [
  {
    id: "simple" as AnnouncementLevel,
    label: "Simple",
    badge: "CONCISE",
    desc: "Brief descriptions — source, title, and age only. Fastest navigation.",
    preview: "Disney Parks Blog. Guardians of the Galaxy ride. 2 hours ago.",
  },
  {
    id: "normal" as AnnouncementLevel,
    label: "Normal",
    badge: "BALANCED",
    desc: "Source, title, content type, save status, and relative time.",
    preview: "Disney Parks Blog. Guardians of the Galaxy ride reopens. Article. 2 hours ago.",
  },
  {
    id: "all" as AnnouncementLevel,
    label: "All Details",
    badge: "VERBOSE",
    desc: "Full metadata including tags, topics, entities, and read status.",
    preview: "Disney Parks Blog. Official. Guardians of the Galaxy ride reopens after refurbishment. Article. Unread. Magic Kingdom. 2 hours ago. Double tap to read.",
  },
];

function AnnouncementLevelPicker({
  value,
  onValueChange,
}: {
  value: AnnouncementLevel;
  onValueChange: (v: AnnouncementLevel) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {ANNOUNCEMENT_LEVELS.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              onValueChange(opt.id);
              AccessibilityInfo.announceForAccessibility(`VoiceOver detail: ${opt.label} selected.`);
            }}
            accessible
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${opt.label}${isSelected ? ", selected" : ""}. ${opt.badge}. ${opt.desc}`}
            accessibilityHint="Double tap to select. Use the Actions rotor to hear the VoiceOver sample."
            accessibilityActions={[{ name: "hearSample", label: "Hear VoiceOver sample" }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === "hearSample") {
                AccessibilityInfo.announceForAccessibility(`${opt.label} sample. VoiceOver reads: ${opt.preview}`);
              }
            }}
            style={[
              styles.levelCard,
              {
                borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
              },
            ]}
          >
            <View style={styles.levelHeader}>
              <Text style={[styles.levelLabel, { color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}>
                {opt.label}
              </Text>
              <View style={[styles.levelBadge, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant }]}>
                <Text style={[styles.levelBadgeText, { color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}>
                  {opt.badge}
                </Text>
              </View>
              {isSelected ? (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color={theme.colors.primary}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              ) : null}
            </View>
            <Text style={[styles.levelDesc, { color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>
              {opt.desc}
            </Text>
            <View style={[styles.previewBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
              <Text style={[styles.previewLabel, { color: theme.colors.onSurfaceVariant }]}>
                VOICEOVER READS
              </Text>
              <Text style={[styles.previewText, { color: theme.colors.onSurface }]}>
                {opt.preview}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
// Phase 07: Card Density and Motion & Sound (plus the Test Sounds panel) moved to
// ReadingExperienceScreen — this screen now covers only VoiceOver and Vision, matching
// the spec's Accessibility group ("VoiceOver enhancements, braille-efficient layout,
// high-contrast cards, always-visible labels, simplified navigation").

export function AccessibilityPreferencesScreen() {
  const app = useAppContext();
  const { playConfirm } = useSounds();
  const settings = app.settings;

  if (!settings) return null;

  const update = (patch: Partial<typeof settings>) => {
    playConfirm();
    app.updateSettings({ ...settings, ...patch });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PrefSectionLabel>VoiceOver</PrefSectionLabel>
        <PrefChoiceLabel>Announcement Detail Level</PrefChoiceLabel>
        <AnnouncementLevelPicker
          value={settings.announcementLevel}
          onValueChange={(v) => update({ announcementLevel: v })}
        />
        <PrefSwitchRow
          title="New Articles Summary"
          description="Announce how many new articles are available when you open the app."
          value={settings.newArticlesSummaryEnabled}
          onValueChange={(v) => update({ newArticlesSummaryEnabled: v })}
        />

        <Divider style={styles.divider} />

        <PrefSectionLabel>Vision</PrefSectionLabel>
        <PrefGroup>
          <PrefSwitchRow
            title="Enhanced Spacing"
            description="Increase line height and element padding for easier reading."
            value={settings.lowVisionEnhancedSpacing}
            onValueChange={(v) => update({ lowVisionEnhancedSpacing: v })}
          />
          <PrefSwitchRow
            title="Bold Metadata"
            description="Bold source names, timestamps, and labels."
            value={settings.lowVisionBoldMetadata}
            onValueChange={(v) => update({ lowVisionBoldMetadata: v })}
          />
          <PrefSwitchRow
            title="High Visual Contrast"
            description="Increase contrast of borders, text, and backgrounds."
            value={settings.highVisualContrastMode}
            onValueChange={(v) => update({ highVisualContrastMode: v })}
          />
          <PrefSwitchRow
            title="Hide Thumbnails"
            description="Remove thumbnail images to reduce visual clutter."
            value={settings.hideThumbnailsForLowVision}
            onValueChange={(v) => update({ hideThumbnailsForLowVision: v })}
          />
          <PrefSwitchRow
            title="VoiceOver Optimized Layout"
            description="Reduce swipe stops, use concise feed labels, and prefer single adjustable controls over chip rows."
            value={settings.simplifiedLayoutEnabled}
            onValueChange={(v) => update({ simplifiedLayoutEnabled: v, announcementLevel: v ? "simple" : settings.announcementLevel })}
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
  divider: {
    marginVertical: 8,
  },
  levelCard: {
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  levelBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  levelDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  previewBox: {
    borderRadius: 8,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
