import "./src/i18n";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, useColorScheme, useWindowDimensions, View } from "react-native";
import { ActivityIndicator, PaperProvider, Text } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { CloudSyncProvider } from "./src/context/CloudSyncContext";
import { CompanionModeProvider } from "./src/context/CompanionModeContext";
import { TripCompanionProvider } from "./src/context/TripCompanionContext";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { PersonalizationProvider } from "./src/context/PersonalizationContext";
import { MiniPlayer } from "./src/components/MiniPlayer";
import { MsgHeaderBanner } from "./src/components/MsgHeaderBanner";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { StartupWizardScreen } from "./src/screens/StartupWizardScreen";
import { FirstTimeTour } from "./src/components/FirstTimeTour";
import { getFlagBool } from "./src/services/featureFlags";
import { PlaybackProvider } from "./src/context/PlaybackContext";
import { SoundProvider, useSounds } from "./src/context/SoundContext";
import { ToastProvider, useToast } from "./src/context/ToastContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { getThemeForColorTheme } from "./src/theme/theme";
import { defaultUserSettings } from "./src/domain/models";
import { StatusBar } from "expo-status-bar";
import { registerBackgroundFetch } from "./src/services/backgroundTask";

function ThemedApp() {
  const app = useAppContext();
  const { playMagic, playSession, playWelcome } = useSounds();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const magicPlayedRef = useRef(false);
  const welcomeShownRef = useRef(false);
  const welcomePlayedRef = useRef(false);
  const [useStartupWizard, setUseStartupWizard] = useState(true);
  const [showGrandTour, setShowGrandTour] = useState(false);
  const systemColorScheme = useColorScheme();
  const systemIsDark = systemColorScheme === "dark";
  const colorTheme = app.settings?.colorTheme ?? "system";
  const highContrast = app.settings?.highVisualContrastMode ?? false;
  const paperTheme = getThemeForColorTheme(colorTheme, systemIsDark, highContrast);
  const isDark = paperTheme.dark;
  const { width: screenWidth } = useWindowDimensions();

  // Greet on every cold launch, before the feed even starts loading — mirrors the
  // "welcome, then pulls the feed, then states what's new" flow, distinct from the
  // magic-wand/new-articles cues below which specifically mark the feed being ready.
  useEffect(() => {
    if (welcomePlayedRef.current) return;
    welcomePlayedRef.current = true;
    playWelcome();
    AccessibilityInfo.announceForAccessibility(t("common.welcomeTitle"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 09 — defaults to the new Startup Wizard; only reads the flag override (an
  // existing install could have explicitly turned it off via developer tools).
  useEffect(() => {
    getFlagBool("startupWizardEnabled").then(setUseStartupWizard).catch(() => {});
  }, []);

  useEffect(() => {
    if (!app.isLoading && app.isFirstLaunch === false && !magicPlayedRef.current) {
      magicPlayedRef.current = true;
      playMagic();
    }
  }, [app.isLoading, app.isFirstLaunch, playMagic]);

  // Show "new since last visit" toast once after feed loads
  useEffect(() => {
    if (
      !welcomeShownRef.current &&
      !app.isLoading &&
      app.isFirstLaunch === false &&
      app.newArticlesSinceLastVisit > 0 &&
      (app.settings?.newArticlesSummaryEnabled ?? true)
    ) {
      welcomeShownRef.current = true;
      playSession();
      showToast(
        t("toast.newArticles", { count: app.newArticlesSinceLastVisit }),
        "info"
      );
    }
  }, [app.isLoading, app.isFirstLaunch, app.newArticlesSinceLastVisit, app.settings?.newArticlesSummaryEnabled, playSession, showToast, t]);

  return (
    <PaperProvider theme={paperTheme}>
      <ToastProvider>
        {app.isLoading || app.isFirstLaunch === null ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              paddingHorizontal: 24,
              backgroundColor: paperTheme.colors.background,
            }}
          >
            <MsgHeaderBanner
              width={Math.min(screenWidth - 48, 420)}
              height={Math.min(screenWidth - 48, 420) * (132 / 680)}
              accessible={false}
              accessibilityElementsHidden
            />
            <Text
              accessibilityRole="header"
              style={{ color: paperTheme.colors.onSurface, fontSize: 17, fontWeight: "600" }}
            >
              {t("common.welcomeTitle")}
            </Text>
            <ActivityIndicator
              size="small"
              color={paperTheme.colors.primary}
              accessibilityLabel={t("common.welcomeLoading")}
            />
          </View>
        ) : app.isFirstLaunch ? (
          useStartupWizard ? (
            <StartupWizardScreen
              sources={app.sources}
              settings={app.settings ?? defaultUserSettings}
              onComplete={app.completeOnboarding}
              onRequestGrandTour={() => setShowGrandTour(true)}
            />
          ) : (
            <OnboardingScreen
              sources={app.sources}
              settings={app.settings ?? defaultUserSettings}
              onComplete={app.completeOnboarding}
            />
          )
        ) : (
          <PlaybackProvider>
            <RootNavigator />
            <MiniPlayer />
            <OfflineBanner />
            <FirstTimeTour visible={showGrandTour} onComplete={() => setShowGrandTour(false)} />
            <StatusBar style={isDark ? "light" : "dark"} />
          </PlaybackProvider>
        )}
      </ToastProvider>
    </PaperProvider>
  );
}

export default function App() {
  useEffect(() => {
    registerBackgroundFetch().catch(() => {});
  }, []);

  return (
    <ErrorBoundary fallbackLabel="Main Street Gazette encountered an error. Please restart the app.">
      <SafeAreaProvider>
        <AppProvider>
          <PersonalizationProvider>
            <SoundProvider>
              <CloudSyncProvider>
                <CompanionModeProvider>
                  <TripCompanionProvider>
                    <ThemedApp />
                  </TripCompanionProvider>
                </CompanionModeProvider>
              </CloudSyncProvider>
            </SoundProvider>
          </PersonalizationProvider>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
