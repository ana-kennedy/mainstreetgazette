import React from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { MiniPlayer } from "./src/components/MiniPlayer";
import { PlaybackProvider } from "./src/context/PlaybackContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { getPaperTheme } from "./src/theme/theme";
import { StatusBar } from "expo-status-bar";

function ThemedApp() {
  const app = useAppContext();
  const isDark = app.settings?.darkModeEnabled ?? false;
  const paperTheme = getPaperTheme(isDark);

  return (
    <PaperProvider theme={paperTheme}>
      <PlaybackProvider>
        <RootNavigator />
        <MiniPlayer />
        <StatusBar style={isDark ? "light" : "dark"} />
      </PlaybackProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemedApp />
      </AppProvider>
    </SafeAreaProvider>
  );
}
