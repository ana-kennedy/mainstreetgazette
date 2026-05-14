import React, { useCallback, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { defaultUserSettings, type ColorTheme, type Source, type SourceType, type UserSettings } from "../domain/models";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingProps {
  sources: Source[];
  settings: UserSettings;
  onComplete: (sources: Source[], settings: UserSettings) => Promise<void>;
}

type Step = 0 | 1 | 2 | 3;

const TOTAL_STEPS = 4;
const CACHE_OPTIONS = [7, 14, 30, 60] as const;
const CACHE_LABELS: Record<number, string> = { 7: "7 days", 14: "14 days", 30: "30 days", 60: "60 days" };

// ─── Step progress dots ───────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const theme = useTheme();
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${TOTAL_STEPS}`}
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
      accessibilityLabel={CACHE_LABELS[days] + (days === 14 ? ", recommended" : "")}
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.chipText, { color: selected ? theme.colors.onPrimary : theme.colors.onSurface }]}>
        {CACHE_LABELS[days]}
        {days === 14 ? " ★" : ""}
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
        {busy ? "Loading…" : label}
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

  // Done step
  const [isCompleting, setIsCompleting] = useState(false);

  const goNext = useCallback(() => {
    const nextStep = (step + 1) as Step;
    setStep(nextStep);
    const labels: string[] = ["", "What would you like to follow?", "Preferences", "You're all set!"];
    AccessibilityInfo.announceForAccessibility(labels[nextStep] ?? "");
  }, [step]);

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
    };

    await onComplete(finalSources, finalSettings);
  }, [isCompleting, enableArticles, enableVideos, enablePodcasts, enableReddit, cacheWindowDays, autoRefresh, colorTheme, sources, settings, onComplete]);

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
            Your Disney universe, all in one place.
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
            Park news, videos, podcasts, and community updates — curated for Disney fans.
          </Text>
        </View>
        <View style={styles.footer}>
          <StepDots current={0} />
          <PrimaryButton
            label="Get Started"
            hint="Double tap to begin setting up your feed."
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
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurfaceVariant} accessible={false} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text
            variant="headlineMedium"
            style={[styles.stepTitle, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            What would you like to follow?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Fine-tune individual sources anytime in Settings.
          </Text>

          <SourceTypeRow
            icon="newspaper"
            label="Articles"
            description="Park news, food, planning, and more from top Disney sites"
            value={enableArticles}
            onToggle={setEnableArticles}
          />
          <SourceTypeRow
            icon="play-circle-outline"
            label="Videos"
            description="YouTube channels from top Disney creators"
            value={enableVideos}
            onToggle={setEnableVideos}
          />
          <SourceTypeRow
            icon="microphone"
            label="Podcasts"
            description="Disney-themed shows and community discussions"
            value={enablePodcasts}
            onToggle={setEnablePodcasts}
          />
          <SourceTypeRow
            icon="reddit"
            label="Reddit"
            description="Community posts from Disney subreddits"
            value={enableReddit}
            onToggle={setEnableReddit}
          />
        </ScrollView>

        <View style={styles.footer}>
          <StepDots current={1} />
          <PrimaryButton label="Continue" onPress={goNext} />
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
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurfaceVariant} accessible={false} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text
            variant="headlineMedium"
            style={[styles.stepTitle, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            A few quick preferences
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Everything can be changed later in Settings.
          </Text>

          {/* Cache window */}
          <Text style={[styles.prefLabel, { color: theme.colors.onSurface }]}>
            How long should we keep articles?
          </Text>
          <View
            style={styles.chipRow}
            accessible
            accessibilityRole="radiogroup"
            accessibilityLabel="Article cache duration"
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

          {/* Auto-refresh */}
          <Pressable
            onPress={() => setAutoRefresh((v) => !v)}
            style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessible
            accessibilityRole="switch"
            accessibilityLabel="Refresh news when opening the app"
            accessibilityHint="Fetch the latest stories automatically each time you open Main Street Gazette"
            accessibilityState={{ checked: autoRefresh }}
          >
            <View style={styles.rowText} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>Refresh on launch</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>
                Fetch latest stories when you open the app
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

          {/* Appearance */}
          <Text style={[styles.prefLabel, { color: theme.colors.onSurface }]}>Appearance</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="App appearance"
          >
            <View style={styles.themeRow}>
              <ThemeOption
                icon="cellphone"
                label="System"
                selected={colorTheme === "system"}
                onSelect={() => setColorTheme("system")}
              />
              <ThemeOption
                icon="weather-sunny"
                label="Light"
                selected={colorTheme === "light"}
                onSelect={() => setColorTheme("light")}
              />
              <ThemeOption
                icon="moon-waning-crescent"
                label="Dark"
                selected={colorTheme === "dark"}
                onSelect={() => setColorTheme("dark")}
              />
            </View>
            <View style={[styles.themeRow, { marginTop: 10 }]}>
              <ThemeOption
                icon="castle"
                label="Gazette"
                selected={colorTheme === "gazette"}
                onSelect={() => setColorTheme("gazette")}
              />
              <ThemeOption
                icon="weather-night"
                label="Midnight"
                selected={colorTheme === "midnight"}
                onSelect={() => setColorTheme("midnight")}
              />
              <ThemeOption
                icon="magic-staff"
                label="Fantasy"
                selected={colorTheme === "fantasy"}
                onSelect={() => setColorTheme("fantasy")}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <StepDots current={2} />
          <PrimaryButton label="Continue" onPress={goNext} />
        </View>
      </View>
    );
  }

  // ── Step 3: Done ─────────────────────────────────────────────────────────

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
          You're all set!
        </Text>
        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
          Welcome to Main Street Gazette. Your first news refresh is on the way.
        </Text>
      </View>
      <View style={styles.footer}>
        <StepDots current={3} />
        <PrimaryButton
          label="Start Reading"
          hint="Double tap to enter Main Street Gazette."
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
