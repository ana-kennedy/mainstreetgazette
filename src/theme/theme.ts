import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

export const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#185abc",
    secondary: "#2e7d32",
    tertiary: "#8a4b00",
    background: "#fbfcff",
    surface: "#ffffff",
    surfaceVariant: "#eef2f8",
    onSurface: "#111318",
    onSurfaceVariant: "#414752",
    error: "#b3261e"
  }
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#9fc1ff",
    secondary: "#9bd49d",
    tertiary: "#ffb96f",
    background: "#101317",
    surface: "#181c22",
    surfaceVariant: "#252b34",
    onSurface: "#f0f2f7",
    onSurfaceVariant: "#c5cbd6",
    outline: "#8b94a3",
    error: "#ffb4ab"
  }
};

export function getPaperTheme(isDark: boolean) {
  return isDark ? darkPaperTheme : lightPaperTheme;
}
