import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import type { ColorTheme } from "../domain/models";

// ── Light (default clean white) ──────────────────────────────────────────────
export const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#185abc",
    secondary: "#2e7d32",
    tertiary: "#8a4b00",
    background: "#f2f4f8",
    surface: "#ffffff",
    surfaceVariant: "#e4e8f0",
    onSurface: "#111318",
    onSurfaceVariant: "#414752",
    outline: "#c8cdd8",
    error: "#b3261e"
  }
};

// ── Dark (deep charcoal) ──────────────────────────────────────────────────────
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

// ── Gazette (warm sepia — newspaper editorial feel) ───────────────────────────
export const gazettePaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#7b3f00",
    primaryContainer: "#f4dcc4",
    onPrimaryContainer: "#4a2400",
    secondary: "#a0522d",
    tertiary: "#5c8346",
    background: "#f5ede0",
    surface: "#faf5ec",
    surfaceVariant: "#ede3d4",
    onSurface: "#2c1a0e",
    onSurfaceVariant: "#5c4230",
    outline: "#c4a882",
    error: "#b3261e"
  }
};

// ── Fantasy (Disney-inspired royal purple & castle gold, 90s–2000s palette) ───
export const fantasyPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#5c2d91",
    primaryContainer: "#e6d4f7",
    onPrimaryContainer: "#2a0f60",
    secondary: "#c4820a",
    tertiary: "#2b6cb8",
    background: "#f0e9ff",
    surface: "#f8f3ff",
    surfaceVariant: "#ede6f9",
    onSurface: "#1a0830",
    onSurfaceVariant: "#5c4a80",
    outline: "#c0aee0",
    error: "#b3261e"
  }
};

// ── Midnight (deep navy with sky-blue accents) ────────────────────────────────
export const midnightPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#5eaaf0",
    primaryContainer: "#1a3a5c",
    onPrimaryContainer: "#c8e0ff",
    secondary: "#e8c84a",
    tertiary: "#82cfba",
    background: "#080d18",
    surface: "#0f1729",
    surfaceVariant: "#172035",
    onSurface: "#dde8f8",
    onSurfaceVariant: "#8aa8cc",
    outline: "#2a3d5c",
    error: "#ff7070"
  }
};

export function getThemeForColorTheme(colorTheme: ColorTheme, systemIsDark: boolean) {
  switch (colorTheme) {
    case "light":
      return lightPaperTheme;
    case "dark":
      return darkPaperTheme;
    case "gazette":
      return gazettePaperTheme;
    case "midnight":
      return midnightPaperTheme;
    case "fantasy":
      return fantasyPaperTheme;
    case "system":
    default:
      return systemIsDark ? darkPaperTheme : lightPaperTheme;
  }
}

// Legacy helper kept for any callers that haven't migrated yet
export function getPaperTheme(isDark: boolean) {
  return isDark ? darkPaperTheme : lightPaperTheme;
}
