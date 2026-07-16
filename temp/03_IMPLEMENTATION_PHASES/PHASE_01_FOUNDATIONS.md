# Phase 01 — Shared Design, Copy, Accessibility, and Card Foundations

## Goal
Build the reusable system before rebuilding tabs.

## Tasks
- Consolidate design tokens: spacing, typography, radii, borders, shadows, focus indicators, contrast-safe colors, seasonal accents, motion durations.
- Add semantic components: `GazettePageHeader`, `GazetteSection`, `GazetteCard`, `MediaTypeLabel`, `FreshnessLabel`, `EditorsNote`, `AdaptiveSection`, `SettingsRow`, `EmptyGazetteState`.
- Add centralized copy constants or i18n keys using the approved vocabulary.
- Ensure every card can expose one combined accessible element plus custom actions.
- Add shared focus restoration, heading navigation, keyboard escape, two-finger scrub behavior, and dynamic type stress handling.
- Implement a standard gear button on every root tab header with accessibility label “Settings” and hint “Opens Your Gazette settings.”

## Exit criteria
- Reusable components are documented.
- Components work at maximum Dynamic Type.
- Decorative art is hidden from accessibility.
- No new hard-coded inaccessible colors.
