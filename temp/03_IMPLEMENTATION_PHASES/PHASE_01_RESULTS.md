# Phase 01 Results — Shared Design, Copy, Accessibility, and Card Foundations

## Change log
Built the reusable foundation called for by this phase, reusing existing
patterns where they already satisfied the requirement instead of duplicating
them, and fixed a real copy bug along the way (see below).

### New components (`src/components/`)
- **`GazettePageHeader.tsx`** — exports `GazettePageHeader` (title + gear,
  for future adoption when tabs get rebuilt in Phases 02–05) and
  `SettingsGearButton` (the actual gear button, adopted immediately — see
  "Screens updated" below).
- **`GazetteSection.tsx`** — titled section wrapper; title is a real
  `accessibilityRole="header"`, optional trailing action link.
- **`GazetteCard.tsx`** — shared card chrome (radius, border, padding) plus
  the "one accessible element + accessibilityActions" pattern from the
  accessibility standard. Available for individual cards (`FeedItemCard`,
  `HeroCard`, `StoryClusterCard`, `CollectionCard`) to adopt as their outer
  wrapper in later phases — not retrofitted onto them yet, since that's
  tab-rebuild work (Phases 02–05), not foundation work.
- **`MediaTypeLabel.tsx`** — text-first content-type indicator (article/
  video/podcast/community), decorative icon, reuses the existing
  `contentType.*` i18n keys and the real `ContentType` domain type.
- **`FreshnessLabel.tsx`** — trust-label component for the 7 approved trust
  strings (Live, Updated recently, Estimated, Planning guide, Official
  information, Independent data, Main Street Gazette estimate).
- **`EditorsNote.tsx`** — editorial callout, approved copy "Editor's Note".
- **`AdaptiveSection.tsx`** — tiny wrapper implementing Constitution rule 4
  ("never expose an empty promise"): renders nothing below a configurable
  item-count threshold.

### Intentionally not duplicated
- **`SettingsRow`** — `src/components/PreferenceComponents.tsx` already has
  `PrefNavRow`, `PrefSwitchRow`, `PrefChoiceRow`, `PrefMultiChoiceRow`, and
  `PrefNavCard`, all built to the same accessibility standard (44pt targets,
  combined accessible elements, proper roles/hints). This already covers
  what "SettingsRow" asked for — no new component added.
- **`EmptyGazetteState`** — `src/components/EmptyState.tsx` already covers
  this (title/body/icon/action, icon hidden from accessibility). Use it with
  Gazette-appropriate copy going forward rather than adding a near-duplicate.

### Design tokens (`src/theme/designTokens.ts`)
Added `Border` (hairline/thin), `Shadow.card` (single subtle elevation —
visual system calls for "thin rules and contrast over heavy shadows"),
`FocusRing` (width/offset, theme color applied by consumer), and
`SeasonalAccent` (decorative-only, hidden from accessibility, one icon per
season, `none` default). Contrast-safe colors and high-contrast mode were
already handled by `src/theme/theme.ts` (`applyHighContrast`) — not
duplicated.

### Copy (`src/i18n/locales/en.json`)
Added `gazetteHeader.settingsLabel`/`settingsHint` (shared gear-button copy)
and `trust.*` (the 7 approved trust-label strings). Other locale files were
not touched — `i18n/index.ts` has `fallbackLng: "en"`, so these new keys
render in English for non-English users until translated; nothing breaks.

### Bug fixed: mislabeled gear button
`NewsScreen`, `DiscoverScreen`, and `ForYouScreen` each had their own
`cog-outline` `IconButton` with `accessibilityLabel`/`accessibilityHint`
pulled from `home.menu.preferences` / `home.menu.preferencesHint` — whose
hint text was **"Double tap to open News & Timeline preferences"** literally
on the Discover and For You screens too, since all three screens shared the
same News-specific key. VoiceOver users on those two tabs were hearing a
wrong description. All three now use the single `SettingsGearButton`
component with accurate, shared copy ("Settings" / "Opens Your Gazette
settings."). The orphaned `home.menu.preferences`/`preferencesHint` keys
were removed from `en.json`.

## Files changed
- `src/theme/designTokens.ts` — new tokens
- `src/i18n/locales/en.json` — new `gazetteHeader`/`trust` keys, removed dead `home.menu.preferences*` keys
- `src/components/GazettePageHeader.tsx` — new
- `src/components/GazetteSection.tsx` — new
- `src/components/GazetteCard.tsx` — new
- `src/components/MediaTypeLabel.tsx` — new
- `src/components/FreshnessLabel.tsx` — new
- `src/components/EditorsNote.tsx` — new
- `src/components/AdaptiveSection.tsx` — new
- `src/screens/NewsScreen.tsx` — gear button swapped to `SettingsGearButton`
- `src/screens/DiscoverScreen.tsx` — gear button swapped to `SettingsGearButton`, unused `IconButton` import removed
- `src/screens/ForYouScreen.tsx` — gear button swapped to `SettingsGearButton`, unused `IconButton` import removed
- `src/services/featureFlags.ts` — Phase 00 flags (see PHASE_00_RESULTS.md)

## Migration notes
No persisted data or settings shapes changed — no migration needed. The new
components are additive and unused by anything except the gear-button swap,
so there is no behavior change beyond the corrected VoiceOver hint on
Discover/For You.

## Manual test list
- [ ] VoiceOver: focus the gear button on News, Discover, and For You — all
      three should now announce "Settings — Opens Your Gazette settings."
- [ ] Visual: gear button position/size unchanged on all three screens
      (News passes `styles.iconButton` through; Discover/For You had no
      custom style originally).
- [ ] Dynamic Type at max size: no clipping on the gear button (unchanged
      control, but re-verify since this is a new code path).
- [ ] Confirm tapping the gear button on each of the three tabs still
      navigates to the Preferences/Settings stack.
Blocked on macOS/device access per PHASE_00_RESULTS.md — needs a manual pass
before Phase 02 starts.

## Exit criteria
- [x] Reusable components documented (this file)
- [x] Components work at maximum Dynamic Type — built on existing `Text`/
      Paper primitives with no fixed heights or truncation; not yet visually
      verified on-device (see manual test list)
- [x] Decorative art hidden from accessibility (`accessibilityElementsHidden`
      + `importantForAccessibility="no-hide-descendants"` on every icon)
- [x] No new hard-coded inaccessible colors — all new components pull colors
      from the Paper theme (`useTheme()`), no hex literals except the
      existing `Shadow.card.shadowColor` (shadow color, not text/UI contrast)
