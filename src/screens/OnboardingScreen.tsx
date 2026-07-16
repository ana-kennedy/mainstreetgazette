import React, { useCallback, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { defaultUserSettings, type ColorTheme, type LocationFilterKey, type Source, type SourceType, type UserSettings } from "../domain/models";
import { LOCATION_ORDER } from "../components/LocationFilter";
import { usePersonalization } from "../context/PersonalizationContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingProps {
  sources: Source[];
  settings: UserSettings;
  onComplete: (sources: Source[], settings: UserSettings) => Promise<void>;
}

type Step = 0 | 1 | 2 | 3 | 4;

const TOTAL_STEPS = 5;
const CACHE_OPTIONS = [30, 90, 180, 365] as const;
const FAVORITE_LOCATION_OPTIONS = LOCATION_ORDER.filter((loc) => loc !== "all");

// ─── Step progress dots ───────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("onboarding.stepProgress", { current: current + 1, total: TOTAL_STEPS })}
    >
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          accessible={false}
          style={[
            styles.dot,
            {
              width: i === current ? 20 : 8,
              backgroundColor: i === current ? theme.colors.primary : theme.colors.outline,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Source type toggle row ───────────────────────────────────────────────────

function SourceTypeRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onToggle(!value)}
      style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: value ? theme.colors.primaryContainer : theme.colors.surfaceVariant },
        ]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={value ? theme.colors.primary : theme.colors.onSurfaceVariant}
          accessible={false}
        />
      </View>
      <View style={styles.rowText} accessible={false} importantForAccessibility="no-hide-descendants">
        <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

// ─── Cache duration chip ──────────────────────────────────────────────────────

function CacheChip({ days, selected, onSelect }: { days: number; selected: boolean; onSelect: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const labelKey = `onboarding.prefs.days${days}` as const;
  const label = t(labelKey);
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="radio"
      accessibilityLabel={days === 90 ? t("onboarding.prefs.days90Recommended") : label}
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.chipText, { color: selected ? theme.colors.onPrimary : theme.colors.onSurface }]}>
        {days === 90 ? t("onboarding.prefs.days90Star") : label}
      </Text>
    </Pressable>
  );
}

// ─── Favorite region chip (multi-select) ──────────────────────────────────────

function RegionChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      accessibilityHint={selected ? "Double tap to remove." : "Double tap to add."}
    >
      <Text style={[styles.chipText, { color: selected ? theme.colors.onPrimary : theme.colors.onSurface }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Appearance option ────────────────────────────────────────────────────────

function ThemeOption({
  icon,
  label,
  selected,
  onSelect,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.themeOption,
        {
          backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={24}
        color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
        accessible={false}
      />
      <Text style={[styles.themeLabel, { color: selected ? theme.colors.primary : theme.colors.onSurface }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Shared primary action button ────────────────────────────────────────────

function PrimaryButton({
  label,
  hint,
  onPress,
  busy,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: busy ? 0.7 : 1 }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={busy ? { disabled: true, busy: true } : undefined}
    >
      <Text style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>
        {busy ? "…" : label}
      </Text>
      {!busy && (
        <MaterialCommunityIcons
          name="arrow-right"
          size={20}
          color={theme.colors.onPrimary}
          accessible={false}
        />
      )}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function OnboardingScreen({ sources, settings, onComplete }: OnboardingProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { updatePrefs } = usePersonalization();

  const [step, setStep] = useState<Step>(0);

  // Step 1 — source type toggles
  const [enableArticles, setEnableArticles] = useState(true);
  const [enableVideos, setEnableVideos]     = useState(true);
  const [enablePodcasts, setEnablePodcasts] = useState(true);
  const [enableReddit, setEnableReddit]     = useState(true);

  // Step 2 — preferences
  const [cacheWindowDays, setCacheWindowDays] = useState(settings.cacheWindowDays);
  const [autoRefresh, setAutoRefresh]         = useState(settings.autoRefreshOnLaunch);
  const [colorTheme, setColorTheme]           = useState<ColorTheme>(settings.colorTheme);
  const [voiceOverOptimized, setVoiceOverOptimized] = useState(settings.simplifiedLayoutEnabled);

  // Step 3 — optional favorite regions, feeds the News tab's Favorites picker option
  const [favoriteLocations, setFavoriteLocations] = useState<LocationFilterKey[]>([]);

  // Done step
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (mounted && enabled) setVoiceOverOptimized(true);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const goNext = useCallback(() => {
    const nextStep = (step + 1) as Step;
    setStep(nextStep);
    const labels: string[] = [
      "",
      t("onboarding.sources.title"),
      t("onboarding.prefs.title"),
      t("onboarding.favorites.title"),
      t("onboarding.done.title"),
    ];
    AccessibilityInfo.announceForAccessibility(labels[nextStep] ?? "");
  }, [step, t]);

  function toggleFavoriteLocation(loc: LocationFilterKey) {
    setFavoriteLocations((current) =>
      current.includes(loc) ? current.filter((l) => l !== loc) : [...current, loc]
    );
  }

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1) as Step);
  }, []);

  const handleComplete = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    const typeEnabled: Record<SourceType, boolean> = {
      rssArticle:     enableArticles,
      youtubeChannel: enableVideos,
      podcastRSS:     enablePodcasts,
      redditFeed:     enableReddit,
    };

    const finalSources = sources.map((s) => ({
      ...s,
      isEnabled: typeEnabled[s.sourceType] && s.isDefaultEnabled,
    }));

    const finalSettings: UserSettings = {
      ...settings,
      cacheWindowDays,
      autoRefreshOnLaunch: autoRefresh,
      colorTheme,
      simplifiedLayoutEnabled: voiceOverOptimized,
      announcementLevel: voiceOverOptimized ? "simple" : settings.announcementLevel,
    };

    if (favoriteLocations.length > 0) {
      updatePrefs({ favoriteLocations });
    }

    await onComplete(finalSources, finalSettings);
  }, [isCompleting, enableArticles, enableVideos, enablePodcasts, enableReddit, cacheWindowDays, autoRefresh, colorTheme, voiceOverOptimized, favoriteLocations, updatePrefs, sources, settings, onComplete]);

  const container = [
    styles.container,
    { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 8 },
  ];

  // ── Step 0: Welcome ──────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <View style={container}>
        <View style={styles.centeredContent}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.appIcon}
            accessible={false}
          />
          <Text
            variant="displaySmall"
            style={[styles.welcomeTitle, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            Main Street{"\n"}Gazette
          </Text>
          <Text style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
            {t("onboarding.welcome.tagline")}
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
            {t("onboarding.welcome.body")}
          </Text>
        </View>
        <View style={styles.footer}>
          <StepDots current={0} />
          <PrimaryButton
            label={t("onboarding.welcome.getStarted")}
            hint={t("onboarding.welcome.getStartedHint")}
            onPress={goNext}
          />
        </View>
      </View>
    );
  }

  // ── Step 1: Sources ──────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <View style={container}>
        <Pressable
          onPress={goBack}
          style={styles.backButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.back")}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurfaceVariant} accessible={false} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text
            variant="headlineMedium"
            style={[styles.stepTitle, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            {t("onboarding.sources.title")}
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {t("onboarding.sources.subtitle")}
          </Text>

          <SourceTypeRow
            icon="newspaper"
            label={t("onboarding.sources.articles")}
            description={t("onboarding.sources.articlesDesc")}
            value={enableArticles}
            onToggle={setEnableArticles}
          />
          <SourceTypeRow
            icon="play-circle-outline"
            label={t("onboarding.sources.videos")}
            description={t("onboarding.sources.videosDesc")}
            value={enableVideos}
            onToggle={setEnableVideos}
          />
          <SourceTypeRow
            icon="microphone"
            label={t("onboarding.sources.podcasts")}
            description={t("onboarding.sources.podcastsDesc")}
            value={enablePodcasts}
            onToggle={setEnablePodcasts}
          />
          <SourceTypeRow
            icon="reddit"
            label={t("onboarding.sources.reddit")}
            description={t("onboarding.sources.redditDesc")}
            value={enableReddit}
            onToggle={setEnableReddit}
          />
        </ScrollView>

        <View style={styles.footer}>
          <StepDots current={1} />
          <PrimaryButton label={t("onboarding.continue")} onPress={goNext} />
        </View>
      </View>
    );
  }

  // ── Step 2: Preferences ──────────────────────────────────────────────────

  if (step === 2) {
    return (
      <View style={container}>
        <Pressable
          onPress={goBack}
          style={styles.backButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.back")}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurfaceVariant} accessible={false} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text
            variant="headlineMedium"
            style={[styles.stepTitle, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            {t("onboarding.prefs.title")}
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {t("onboarding.prefs.subtitle")}
          </Text>

          <Text style={[styles.prefLabel, { color: theme.colors.onSurface }]}>
            {t("onboarding.prefs.cacheQuestion")}
          </Text>
          <View
            style={styles.chipRow}
            accessible
            accessibilityRole="radiogroup"
            accessibilityLabel={t("onboarding.prefs.cacheA11y")}
          >
            {CACHE_OPTIONS.map((days) => (
              <CacheChip
                key={days}
                days={days}
                selected={cacheWindowDays === days}
                onSelect={() => setCacheWindowDays(days)}
              />
            ))}
          </View>

          <Pressable
            onPress={() => setAutoRefresh((v) => !v)}
            style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessible
            accessibilityRole="switch"
            accessibilityLabel={t("onboarding.prefs.refreshA11y")}
            accessibilityHint={t("onboarding.prefs.refreshHint")}
            accessibilityState={{ checked: autoRefresh }}
          >
            <View style={styles.rowText} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{t("onboarding.prefs.refreshOnLaunch")}</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>
                {t("onboarding.prefs.refreshDesc")}
              </Text>
            </View>
            <Switch
              value={autoRefresh}
              onValueChange={setAutoRefresh}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>

          <Pressable
            onPress={() => setVoiceOverOptimized((v) => !v)}
            style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessible
            accessibilityRole="switch"
            accessibilityLabel="VoiceOver Optimized Layout"
            accessibilityHint="Simplifies News and Browse screens, reduces swipe stops, and uses concise VoiceOver labels."
            accessibilityState={{ checked: voiceOverOptimized }}
          >
            <View style={styles.rowText} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>VoiceOver Optimized Layout</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>
                Fewer swipe stops, concise cards, and simpler screen structure.
              </Text>
            </View>
            <Switch
              value={voiceOverOptimized}
              onValueChange={setVoiceOverOptimized}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>

          <Text style={[styles.prefLabel, { color: theme.colors.onSurface }]}>{t("onboarding.prefs.appearance")}</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t("onboarding.prefs.appearanceA11y")}
          >
            <View style={styles.themeRow}>
              <ThemeOption icon="cellphone" label={t("onboarding.prefs.themeSystem")} selected={colorTheme === "system"} onSelect={() => setColorTheme("system")} />
              <ThemeOption icon="weather-sunny" label={t("onboarding.prefs.themeLight")} selected={colorTheme === "light"} onSelect={() => setColorTheme("light")} />
              <ThemeOption icon="moon-waning-crescent" label={t("onboarding.prefs.themeDark")} selected={colorTheme === "dark"} onSelect={() => setColorTheme("dark")} />
            </View>
            <View style={[styles.themeRow, { marginTop: 10 }]}>
              <ThemeOption icon="castle" label={t("onboarding.prefs.themeGazette")} selected={colorTheme === "gazette"} onSelect={() => setColorTheme("gazette")} />
              <ThemeOption icon="weather-night" label={t("onboarding.prefs.themeMidnight")} selected={colorTheme === "midnight"} onSelect={() => setColorTheme("midnight")} />
              <ThemeOption icon="magic-staff" label={t("onboarding.prefs.themeFantasy")} selected={colorTheme === "fantasy"} onSelect={() => setColorTheme("fantasy")} />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <StepDots current={2} />
          <PrimaryButton label={t("onboarding.continue")} onPress={goNext} />
        </View>
      </View>
    );
  }

  // ── Step 3: Favorites (optional) ─────────────────────────────────────────

  if (step === 3) {
    return (
      <View style={container}>
        <Pressable
          onPress={goBack}
          style={styles.backButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.back")}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurfaceVariant} accessible={false} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text
            variant="headlineMedium"
            style={[styles.stepTitle, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            {t("onboarding.favorites.title")}
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {t("onboarding.favorites.subtitle")}
          </Text>

          <View style={styles.chipRow}>
            {FAVORITE_LOCATION_OPTIONS.map((loc) => (
              <RegionChip
                key={loc}
                label={t(`knowledge.location.${loc}`)}
                selected={favoriteLocations.includes(loc)}
                onToggle={() => toggleFavoriteLocation(loc)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <StepDots current={3} />
          <PrimaryButton
            label={favoriteLocations.length > 0 ? t("onboarding.continue") : t("onboarding.favorites.skip")}
            onPress={goNext}
          />
        </View>
      </View>
    );
  }

  // ── Step 4: Done ─────────────────────────────────────────────────────────

  return (
    <View style={container}>
      <View style={styles.centeredContent}>
        <View
          style={[styles.doneCircle, { backgroundColor: theme.colors.primaryContainer }]}
          accessible={false}
        >
          <MaterialCommunityIcons name="check-circle" size={64} color={theme.colors.primary} accessible={false} />
        </View>
        <Text
          variant="headlineLarge"
          style={[styles.doneTitle, { color: theme.colors.onSurface }]}
          accessibilityRole="header"
        >
          {t("onboarding.done.title")}
        </Text>
        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
          {t("onboarding.done.body")}
        </Text>
      </View>
      <View style={styles.footer}>
        <StepDots current={4} />
        <PrimaryButton
          label={t("onboarding.done.startReading")}
          hint={t("onboarding.done.startReadingHint")}
          onPress={handleComplete}
          busy={isCompleting}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Centered layout (welcome + done)
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 4,
  },
  welcomeTitle: {
    textAlign: "center",
    fontWeight: "700",
  },
  tagline: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  // Done step
  doneCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  doneTitle: {
    textAlign: "center",
    fontWeight: "700",
  },

  // Progress dots
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },

  // Back button
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  stepTitle: {
    fontWeight: "700",
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },

  // Source type / pref toggle rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Preference section label
  prefLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },

  // Cache chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Theme options
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
