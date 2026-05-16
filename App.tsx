import React, { useEffect, useRef } from "react";
import { useColorScheme, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { MiniPlayer } from "./src/components/MiniPlayer";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { PlaybackProvider } from "./src/context/PlaybackContext";
import { SoundProvider, useSounds } from "./src/context/SoundContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { getThemeForColorTheme } from "./src/theme/theme";
import { defaultUserSettings } from "./src/domain/models";
import { StatusBar } from "expo-status-bar";
import { registerBackgroundFetch } from "./src/services/backgroundTask";

function ThemedApp() {
  const app = useAppContext();
  const { playMagic } = useSounds();
  const magicPlayedRef = useRef(false);
  const systemColorScheme = useColorScheme();
  const systemIsDark = systemColorScheme === "dark";
  const colorTheme = app.settings?.colorTheme ?? "system";
  const paperTheme = getThemeForColorTheme(colorTheme, systemIsDark);
  const isDark = paperTheme.dark;

  useEffect(() => {
    if (!app.isLoading && app.isFirstLaunch === false && !magicPlayedRef.current) {
      magicPlayedRef.current = true;
      playMagic();
    }
  }, [app.isLoading, app.isFirstLaunch, playMagic]);

  return (
    <PaperProvider theme={paperTheme}>
      {app.isLoading || app.isFirstLaunch === null ? (
        // Hold a blank view while hydration runs — Expo splash screen covers this
        <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }} />
      ) : app.isFirstLaunch ? (
        <OnboardingScreen
          sources={app.sources}
          settings={app.settings ?? defaultUserSettings}
          onComplete={app.completeOnboarding}
        />
      ) : (
        <PlaybackProvider>
          <RootNavigator />
          <MiniPlayer />
          <StatusBar style={isDark ? "light" : "dark"} />
        </PlaybackProvider>
      )}
    </PaperProvider>
  );
}

export default function App() {
  useEffect(() => {
    registerBackgroundFetch().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <SoundProvider>
        <AppProvider>
          <ThemedApp />
        </AppProvider>
      </SoundProvider>
    </SafeAreaProvider>
  );
}
