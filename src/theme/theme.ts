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

// ── Gazette (deep navy & gold — Main Street Gazette masthead palette) ────────
export const gazettePaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#c9a227",
    primaryContainer: "#1e3060",
    onPrimaryContainer: "#f0e8d4",
    secondary: "#e8d5a0",
    tertiary: "#8ab4d4",
    background: "#0d1b3e",
    surface: "#112347",
    surfaceVariant: "#1a2f55",
    onSurface: "#f0e8d4",
    onSurfaceVariant: "#c9a227",
    outline: "#2a3d6a",
    error: "#ff7070"
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

type PaperTheme = typeof lightPaperTheme;

// Overlays stronger contrast values — pure black/white backgrounds, maximum text contrast,
// and heavier borders. Applied on top of any base theme when highVisualContrastMode is enabled.
function applyHighContrast(base: PaperTheme): PaperTheme {
  if (base.dark) {
    return {
      ...base,
      colors: {
        ...base.colors,
        background: "#000000",
        surface: "#0a0a0a",
        surfaceVariant: "#1c1c1c",
        onSurface: "#ffffff",
        onSurfaceVariant: "#eeeeee",
        outline: "#777777",
        outlineVariant: "#555555",
        primary: "#7eb8ff",
        onPrimary: "#000000",
        error: "#ff6b6b",
      },
    };
  }
  return {
    ...base,
    colors: {
      ...base.colors,
      background: "#ffffff",
      surface: "#ffffff",
      surfaceVariant: "#e0e0e0",
      onSurface: "#000000",
      onSurfaceVariant: "#111111",
      outline: "#333333",
      outlineVariant: "#555555",
      primary: "#003399",
      onPrimary: "#ffffff",
      error: "#c00000",
    },
  };
}

export function getThemeForColorTheme(
  colorTheme: ColorTheme,
  systemIsDark: boolean,
  highContrast = false
): PaperTheme {
  let base: PaperTheme;
  switch (colorTheme) {
    case "light":   base = lightPaperTheme; break;
    case "dark":    base = darkPaperTheme; break;
    case "gazette": base = gazettePaperTheme; break;
    case "midnight": base = midnightPaperTheme; break;
    case "fantasy": base = fantasyPaperTheme; break;
    case "system":
    default:
      base = systemIsDark ? darkPaperTheme : lightPaperTheme;
  }
  return highContrast ? applyHighContrast(base) : base;
}

// Legacy helper kept for any callers that haven't migrated yet
export function getPaperTheme(isDark: boolean) {
  return isDark ? darkPaperTheme : lightPaperTheme;
}
