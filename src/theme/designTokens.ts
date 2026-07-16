// Phase 51 — Design System tokens
// Single source of truth for spacing, radius, typography, and motion constants.
// Import these instead of hardcoding magic numbers throughout the codebase.
import { StyleSheet } from "react-native";

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const Typography = {
  /** Large page headings (28pt) */
  pageTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 } as const,
  /** Section headers (11pt, uppercase) */
  sectionHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" } as const,
  /** Primary card/row labels (16pt) */
  label: { fontSize: 16, fontWeight: "600" } as const,
  /** Secondary descriptive text (13pt) */
  description: { fontSize: 13, lineHeight: 18 } as const,
  /** Tiny badge/chip text (9–11pt) */
  badge: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 } as const,
} as const;

export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 36,
  hero: 52,
} as const;

export const Motion = {
  /** Standard card entrance fade duration (ms) */
  fadeIn: 500,
  /** Offline banner slide-in (ms) */
  slideIn: 220,
  /** Offline banner slide-out (ms) */
  slideOut: 180,
  /** Short press feedback (ms) */
  press: 100,
} as const;

export const ZIndex = {
  modal: 9999,
  offlineBanner: 9998,
  miniPlayer: 100,
  overlay: 10,
} as const;

/** Minimum touch target size per Apple HIG (44×44 pt) */
export const MinTouchTarget = 44;

/** Tab bar item count for layout calculations */
export const TabCount = 5;

export const Border = {
  /** Thin rule between rows/sections */
  hairline: StyleSheet.hairlineWidth,
  /** Card/control outline width */
  thin: 1,
} as const;

/**
 * Visual design system calls for "thin rules and contrast over heavy shadows."
 * Single subtle elevation for cards — do not stack additional shadow styles.
 */
export const Shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
} as const;

/** Visible keyboard/switch-control focus ring — theme color applied by the consumer */
export const FocusRing = {
  width: 2,
  offset: 2,
} as const;

/**
 * Small, optional, decorative-only accents by season. Hidden from accessibility;
 * must never be the only signal for content or state. Respect Reduce Motion.
 */
export const SeasonalAccent = {
  none: null,
  holiday: { icon: "snowflake-variant" },
  spring: { icon: "flower-outline" },
  summer: { icon: "white-balance-sunny" },
  fall: { icon: "leaf-maple" },
} as const;
