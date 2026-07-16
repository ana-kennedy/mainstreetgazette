// Phase 09 — Startup Wizard: The Gazette Arrival. Replaces the legacy 5-step
// OnboardingScreen.tsx (kept in place, not deleted, and still used when the
// `startupWizardEnabled` feature flag is off) with the spec's 9 pages
// (temp/03_IMPLEMENTATION_PHASES/PHASE_09_STARTUP_WIZARD.md): Welcome, A Newspaper for
// Disney Fans, My Magic, The Living Gazette Library, Save the Magic, Gazette Alerts,
// Make the Gazette Yours, Meet Your Gazette, Your First Edition Is Ready.
//
// Reuses real content/logic from screens built earlier this session rather than
// re-deriving it: My Magic's destination/interest taxonomy (MyMagicScreen.tsx),
// Gazette Alerts' four named choices verbatim (GazetteAlertsScreen.tsx), and the
// Living Gazette Library's approved "continues to grow" string (i18n `library.growing`,
// Phase 06). Per the spec, this screen never requests system notification
// permission — Gazette Alerts choices are stored as preferences only; the OS prompt
// only ever appears later, from GazetteAlertsScreen itself, in direct response to a
// user toggle there (see PHASE_08_RESULTS.md).
import React, { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Switch, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ColorTheme, Source, UserSettings } from "../domain/models";
import { usePersonalization } from "../context/PersonalizationContext";
import { PrefMultiChoiceRow } from "../components/PreferenceComponents";
import { DESTINATION_IDS, INTEREST_IDS } from "./MyMagicScreen";
import { ALERT_CHOICES } from "./GazetteAlertsScreen";

export interface StartupWizardProps {
  sources: Source[];
  settings: UserSettings;
  onComplete: (sources: Source[], settings: UserSettings) => Promise<void>;
  onRequestGrandTour: () => void;
}

const TOTAL_STEPS = 9;

const THEME_OPTIONS: Array<{ value: ColorTheme; label: string; icon: string }> = [
  { value: "system", label: "Auto", icon: "brightness-auto" },
  { value: "light", label: "Light", icon: "white-balance-sunny" },
  { value: "dark", label: "Dark", icon: "moon-waxing-crescent" },
];

function StepDots({ current }: { current: number }) {
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
            { width: i === current ? 20 : 8, backgroundColor: i === current ? theme.colors.primary : theme.colors.outline },
          ]}
        />
      ))}
    </View>
  );
}

function WizardPage({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.page}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <MaterialCommunityIcons name={icon as any} size={36} color={theme.colors.primary} />
      </View>
      <Text variant="headlineSmall" style={[styles.pageTitle, { color: theme.colors.onSurface }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function FeatureRow({ icon, title, description }: { icon: string; title: string; description: string }) {
  const theme = useTheme();
  return (
    <View style={styles.featureRow} accessible accessibilityLabel={`${title}. ${description}`}>
      <MaterialCommunityIcons name={icon as any} size={22} color={theme.colors.primary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>{title}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{description}</Text>
      </View>
    </View>
  );
}

export function StartupWizardScreen({ sources, settings, onComplete, onRequestGrandTour }: StartupWizardProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { prefs, updatePrefs } = usePersonalization();

  const [step, setStep] = useState(0);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(settings.colorTheme);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(settings.soundEffectsEnabled);
  const [simplifiedLayoutEnabled, setSimplifiedLayoutEnabled] = useState(settings.simplifiedLayoutEnabled);
  const [highVisualContrastMode, setHighVisualContrastMode] = useState(settings.highVisualContrastMode);
  const [alertValues, setAlertValues] = useState<Record<string, boolean>>({
    dailyDigestEnabled: settings.dailyDigestEnabled,
    breakingNewsEnabled: settings.breakingNewsEnabled,
    disneyMomentsEnabled: settings.disneyMomentsEnabled,
    tripCompanionAlertsEnabled: settings.tripCompanionAlertsEnabled,
  });

  // Matches the legacy OnboardingScreen's behavior: a screen reader already running
  // is a strong signal to default to the simplified, VoiceOver-optimized layout.
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (enabled) setSimplifiedLayoutEnabled(true);
    });
  }, []);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t("onboarding.stepProgress", { current: step + 1, total: TOTAL_STEPS }));
  }, [step, t]);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const buildFinalState = useCallback((): { finalSources: Source[]; finalSettings: UserSettings } => {
    const finalSources = sources.map((s) => ({ ...s, isEnabled: s.isDefaultEnabled }));
    const finalSettings: UserSettings = {
      ...settings,
      colorTheme,
      soundEffectsEnabled,
      simplifiedLayoutEnabled,
      announcementLevel: simplifiedLayoutEnabled ? "simple" : settings.announcementLevel,
      highVisualContrastMode,
      dailyDigestEnabled: alertValues.dailyDigestEnabled,
      breakingNewsEnabled: alertValues.breakingNewsEnabled,
      disneyMomentsEnabled: alertValues.disneyMomentsEnabled,
      tripCompanionAlertsEnabled: alertValues.tripCompanionAlertsEnabled,
    };
    return { finalSources, finalSettings };
  }, [sources, settings, colorTheme, soundEffectsEnabled, simplifiedLayoutEnabled, highVisualContrastMode, alertValues]);

  const handleOpenGazette = useCallback(async () => {
    const { finalSources, finalSettings } = buildFinalState();
    await onComplete(finalSources, finalSettings);
  }, [buildFinalState, onComplete]);

  const handleGrandTour = useCallback(async () => {
    await handleOpenGazette();
    onRequestGrandTour();
  }, [handleOpenGazette, onRequestGrandTour]);

  const destinationOptions = DESTINATION_IDS.map((id) => ({
    value: id as string,
    label: t(`myMagic.destination.${id}`),
    accessibilityLabel: t(`myMagic.destination.${id}`),
  }));
  const interestOptions = INTEREST_IDS.map((id) => ({
    value: id,
    label: t(`myMagic.interest.${id}`),
    accessibilityLabel: t(`myMagic.interest.${id}`),
  }));

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <WizardPage icon="newspaper-variant" title="Welcome to Main Street Gazette">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              A warmly prepared Disney newspaper and daily companion — news, park information,
              and the things you love, gathered in one place.
            </Text>
          </WizardPage>
        );
      case 1:
        return (
          <WizardPage icon="book-open-page-variant-outline" title="A Newspaper for Disney Fans">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              Your Gazette mixes articles, videos, podcasts, and community posts from official
              Disney sources and independent fan sites alike — always clearly labeled, so you
              know what you're reading.
            </Text>
          </WizardPage>
        );
      case 2:
        return (
          <WizardPage icon="star-circle-outline" title="My Magic">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              Optional: choose the destinations and topics you'd like the Gazette to highlight.
              You can always change these later.
            </Text>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginTop: 8 }}>Destinations</Text>
            <PrefMultiChoiceRow<string>
              values={prefs.favoriteLocations}
              options={destinationOptions}
              onToggle={(id) => updatePrefs({ favoriteLocations: prefs.favoriteLocations.includes(id) ? prefs.favoriteLocations.filter((v) => v !== id) : [...prefs.favoriteLocations, id] })}
            />
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginTop: 12 }}>Interests</Text>
            <PrefMultiChoiceRow<string>
              values={prefs.favoriteTopics}
              options={interestOptions}
              onToggle={(id) => updatePrefs({ favoriteTopics: prefs.favoriteTopics.includes(id) ? prefs.favoriteTopics.filter((v) => v !== id) : [...prefs.favoriteTopics, id] })}
            />
          </WizardPage>
        );
      case 3:
        return (
          <WizardPage icon="bookshelf" title="The Living Gazette Library">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              {t("library.growing")}
            </Text>
          </WizardPage>
        );
      case 4:
        return (
          <WizardPage icon="bookmark-multiple-outline" title="Save the Magic">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              Save any article, video, or podcast to your Gazette Library with one tap. Followed
              Collections gather related stories together, so themed coverage is easy to find.
            </Text>
          </WizardPage>
        );
      case 5:
        return (
          <WizardPage icon="bell-outline" title="Gazette Alerts">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              Choose when the Gazette may gently let you know something is ready. You can turn
              these on now, or decide later — nothing is enabled without your say.
            </Text>
            {ALERT_CHOICES.map((choice) => (
              <View key={choice.key} style={styles.alertRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: "600" }}>{choice.title}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>{choice.description}</Text>
                </View>
                <Switch
                  value={alertValues[choice.key]}
                  onValueChange={(v) => setAlertValues((prev) => ({ ...prev, [choice.key]: v }))}
                  accessibilityLabel={choice.title}
                  accessibilityHint={choice.description}
                />
              </View>
            ))}
          </WizardPage>
        );
      case 6:
        return (
          <WizardPage icon="palette-outline" title="Make the Gazette Yours">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              A few quick touches — you'll find far more options later under Reading Experience
              and Accessibility.
            </Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const selected = colorTheme === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setColorTheme(opt.value)}
                    style={[
                      styles.themeChip,
                      { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${opt.label} theme`}
                  >
                    <MaterialCommunityIcons name={opt.icon as any} size={18} color={selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
                    <Text style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontSize: 13, fontWeight: "600" }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.alertRow}>
              <Text style={{ flex: 1, color: theme.colors.onSurface }}>Sound effects</Text>
              <Switch value={soundEffectsEnabled} onValueChange={setSoundEffectsEnabled} accessibilityLabel="Sound effects" />
            </View>
            <View style={styles.alertRow}>
              <Text style={{ flex: 1, color: theme.colors.onSurface }}>VoiceOver-optimized layout</Text>
              <Switch value={simplifiedLayoutEnabled} onValueChange={setSimplifiedLayoutEnabled} accessibilityLabel="VoiceOver optimized layout" />
            </View>
            <View style={styles.alertRow}>
              <Text style={{ flex: 1, color: theme.colors.onSurface }}>High visual contrast</Text>
              <Switch value={highVisualContrastMode} onValueChange={setHighVisualContrastMode} accessibilityLabel="High visual contrast" />
            </View>
            <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
              Motion always follows your iPhone's Reduce Motion setting automatically.
            </Text>
          </WizardPage>
        );
      case 7:
        return (
          <WizardPage icon="view-dashboard-outline" title="Meet Your Gazette">
            <FeatureRow icon="newspaper-variant-outline" title="News" description="Your Disney feed — articles, videos, and podcasts, automatically grouped by story." />
            <FeatureRow icon="castle" title="Explore" description="Live park information — wait times, weather, hours, and planning tools." />
            <FeatureRow icon="star-circle-outline" title="For You" description="Pick up where you left off, revisit your Library, and see picks based on My Magic." />
          </WizardPage>
        );
      case 8:
      default:
        return (
          <WizardPage icon="check-circle-outline" title="Your First Edition Is Ready">
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              Everything's set. You can change anything, anytime, from the gear icon on any tab.
            </Text>
          </WizardPage>
        );
    }
  }

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <StepDots current={step} />
      <ScrollView contentContainerStyle={styles.scroll}>{renderStep()}</ScrollView>
      <View style={styles.footer}>
        {step > 0 ? (
          <Button mode="text" onPress={goBack} accessibilityLabel="Back">
            Back
          </Button>
        ) : <View />}
        {isLast ? (
          <View style={styles.lastActions}>
            <Button mode="outlined" onPress={handleGrandTour} accessibilityLabel="Take the Grand Tour" style={{ marginBottom: 8 }}>
              Take the Grand Tour
            </Button>
            <Button mode="contained" onPress={handleOpenGazette} accessibilityLabel="Open Today's Gazette">
              Open Today's Gazette
            </Button>
          </View>
        ) : (
          <Button mode="contained" onPress={goNext} accessibilityLabel={step === 0 ? "Begin Today's Edition" : "Next"}>
            {step === 0 ? "Begin Today's Edition" : "Next"}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 8,
    marginBottom: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  page: {
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  pageTitle: {
    fontWeight: "700",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  footer: {
    paddingTop: 8,
  },
  lastActions: {
    gap: 4,
  },
});
