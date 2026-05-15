import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Switch, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { ColorTheme } from "../domain/models";

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
            <Text style={{ color: isSelected ? theme.colors.onPrimary : theme.colors.primary, fontSize: 14, fontWeight: "500" }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ThemePickerRow({
  value,
  onValueChange
}: {
  value: ColorTheme;
  onValueChange: (v: ColorTheme) => void;
}) {
  const theme = useTheme();

  const options: { value: ColorTheme; label: string; subtitle: string; icon: string }[] = [
    { value: "system", label: "System", subtitle: "Matches your device setting", icon: "brightness-auto" },
    { value: "light", label: "Light", subtitle: "Clean white", icon: "white-balance-sunny" },
    { value: "dark", label: "Dark", subtitle: "Charcoal dark", icon: "moon-waxing-crescent" },
    { value: "gazette", label: "Gazette", subtitle: "Warm sepia editorial", icon: "newspaper-variant" },
    { value: "midnight", label: "Midnight", subtitle: "Deep navy with blue accents", icon: "star-four-points" },
    { value: "fantasy", label: "Fantasy", subtitle: "Royal purple & castle gold", icon: "auto-fix" }
  ];

  return (
    <View style={styles.themeGrid}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onValueChange(opt.value)}
            style={[
              styles.themeCard,
              {
                backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth
              }
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
            <Text style={[styles.themeCardLabel, { color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}>
              {opt.label}
            </Text>
            <Text style={[styles.themeCardSub, { color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>
              {opt.subtitle}
            </Text>
            {isSelected ? (
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color={theme.colors.primary}
                style={styles.themeCheckmark}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : null}
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
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{description}</Text>
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

function NavRow({ label, icon, onPress, hint }: { label: string; icon: string; onPress: () => void; hint: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface, borderColor: theme.colors.outline }
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={theme.colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[styles.navRowText, { color: theme.colors.onSurface }]}>{label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function SettingsScreen() {
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
        <Text variant="headlineMedium" style={styles.pageTitle} accessibilityRole="header">
          Settings
        </Text>

        <SectionLabel>Appearance</SectionLabel>
        <ThemePickerRow
          value={settings.colorTheme}
          onValueChange={(v) => update({ colorTheme: v })}
        />

        <Divider style={styles.divider} />

        <SectionLabel>Feed</SectionLabel>
        <SettingSwitchRow
          title="Auto refresh on launch"
          description="Fetch enabled feeds when the app starts."
          value={settings.autoRefreshOnLaunch}
          onValueChange={(v) => update({ autoRefreshOnLaunch: v })}
        />
        <SettingSwitchRow
          title="Show only checkpoint-new items"
          description="Hide older stories until you choose to show all."
          value={settings.showOnlyNew}
          onValueChange={(v) => update({ showOnlyNew: v })}
        />
        <Text variant="bodyLarge" style={styles.optionLabel}>Sort order</Text>
        <ChoiceRow
          value={settings.sortOrder}
          onValueChange={(v) => update({ sortOrder: v as typeof settings.sortOrder })}
          options={[
            { value: "newestFirst", label: "Newest first", accessibilityLabel: "Sort newest first" },
            { value: "oldestFirst", label: "Oldest first", accessibilityLabel: "Sort oldest first" }
          ]}
        />
        <Text variant="bodyLarge" style={styles.optionLabel}>Article preview</Text>
        <ChoiceRow
          value={String(settings.previewLength)}
          onValueChange={(v) => update({ previewLength: Number(v) })}
          options={[
            { value: "1", label: "1 line", accessibilityLabel: "1 sentence preview" },
            { value: "2", label: "2 lines", accessibilityLabel: "2 sentence preview" },
            { value: "3", label: "3 lines", accessibilityLabel: "3 sentence preview" },
            { value: "4", label: "4 lines", accessibilityLabel: "4 sentence preview" },
            { value: "5", label: "5 lines", accessibilityLabel: "5 sentence preview" },
            { value: "0", label: "Full", accessibilityLabel: "Full article summary" }
          ]}
        />

        {Platform.OS === "ios" ? (
          <>
            <Divider style={styles.divider} />
            <SectionLabel>Reading</SectionLabel>
            <SettingSwitchRow
              title="Reader mode"
              description="Open articles in Safari's distraction-free reader view automatically."
              value={settings.preferReaderMode}
              onValueChange={(v) => update({ preferReaderMode: v })}
            />
          </>
        ) : null}

        <Divider style={styles.divider} />

        <SectionLabel>Cache</SectionLabel>
        <SettingSwitchRow
          title="Offline saving"
          description="Show cached content when the network is unavailable."
          value={settings.offlineSavingEnabled}
          onValueChange={(v) => update({ offlineSavingEnabled: v })}
        />
        <Text variant="bodyLarge" style={styles.optionLabel}>Cache window</Text>
        <ChoiceRow
          value={String(settings.cacheWindowDays)}
          onValueChange={(v) => update({ cacheWindowDays: Number(v) })}
          options={[
            { value: "7", label: "1 Week", accessibilityLabel: "Cache window 1 week" },
            { value: "30", label: "1 Month", accessibilityLabel: "Cache window 1 month" }
          ]}
        />
        <Text variant="bodyLarge" style={styles.optionLabel}>Max cached items</Text>
        <ChoiceRow
          value={String(settings.maxCachedItems)}
          onValueChange={(v) => update({ maxCachedItems: Number(v) })}
          options={[
            { value: "100", label: "100", accessibilityLabel: "Maximum 100 cached items" },
            { value: "250", label: "250", accessibilityLabel: "Maximum 250 cached items" },
            { value: "500", label: "500", accessibilityLabel: "Maximum 500 cached items" },
            { value: "1000", label: "1000", accessibilityLabel: "Maximum 1000 cached items" }
          ]}
        />

        <Divider style={styles.divider} />

        <SectionLabel>Accessibility</SectionLabel>
        <SettingSwitchRow
          title="Enhanced spacing"
          description="Adds more breathing room for low-vision layouts."
          value={settings.lowVisionEnhancedSpacing}
          onValueChange={(v) => update({ lowVisionEnhancedSpacing: v })}
        />
        <SettingSwitchRow
          title="Bold metadata"
          description="Makes source and time metadata easier to scan."
          value={settings.lowVisionBoldMetadata}
          onValueChange={(v) => update({ lowVisionBoldMetadata: v })}
        />
        <SettingSwitchRow
          title="Hide thumbnails"
          description="Reduces visual clutter in feed rows."
          value={settings.hideThumbnailsForLowVision}
          onValueChange={(v) => update({ hideThumbnailsForLowVision: v })}
        />

        <Divider style={styles.divider} />

        <SectionLabel>Playback</SectionLabel>
        <Text variant="bodyLarge" style={styles.optionLabel}>Default speed</Text>
        <ChoiceRow
          value={String(settings.playbackDefaultSpeed)}
          onValueChange={(v) => update({ playbackDefaultSpeed: Number(v) })}
          options={[
            { value: "0.75", label: "0.75×", accessibilityLabel: "0.75 times speed" },
            { value: "1", label: "1×", accessibilityLabel: "Normal speed" },
            { value: "1.25", label: "1.25×", accessibilityLabel: "1.25 times speed" },
            { value: "1.5", label: "1.5×", accessibilityLabel: "1.5 times speed" },
            { value: "2", label: "2×", accessibilityLabel: "2 times speed" }
          ]}
        />
        <View style={styles.footer}>
          <SectionLabel>Privacy &amp; Legal</SectionLabel>
          <Text variant="bodyMedium" style={styles.footerText}>
            Main Street Gazette stores feeds, saved items, source choices, settings, queue, and playback progress locally on this device. No accounts, ads, analytics, or tracking.
          </Text>
          <Text variant="bodySmall" style={styles.footerText}>
            Main Street Gazette is an independent feed reader and podcast player. Not affiliated with, endorsed by, or sponsored by Disney or the listed publishers.
          </Text>
          <Button
            mode="outlined"
            icon="open-in-new"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityLabel="Open Privacy Policy"
            accessibilityRole="button"
            accessibilityHint="Double tap to open the privacy policy in your browser."
          >
            Privacy Policy
          </Button>
          <Button
            mode="outlined"
            icon="lifebuoy"
            onPress={() => Linking.openURL(SUPPORT_URL)}
            accessibilityLabel="Open Support"
            accessibilityRole="button"
            accessibilityHint="Double tap to open the support page in your browser."
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
    gap: 10
  },
  pageTitle: {
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2
  },
  divider: {
    marginVertical: 8
  },
  optionLabel: {
    marginTop: 4,
    marginBottom: 2
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  themeCard: {
    width: "47%",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    minHeight: 90
  },
  themeCardLabel: {
    fontSize: 15,
    fontWeight: "700"
  },
  themeCardSub: {
    fontSize: 12,
    lineHeight: 16
  },
  themeCheckmark: {
    position: "absolute",
    top: 10,
    right: 10
  },
  switchRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
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
    borderRadius: 10,
    overflow: "hidden"
  },
  choiceButton: {
    minHeight: 44,
    minWidth: 80,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 50
  },
  navRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500"
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10
  },
  footerText: {
    lineHeight: 20
  }
});
