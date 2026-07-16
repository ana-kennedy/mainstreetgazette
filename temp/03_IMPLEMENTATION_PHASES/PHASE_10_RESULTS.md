# Phase 10 Results — Visual, Sound, Accessibility, Performance, and Release Audit

## Scope decision, up front
This phase's spec is almost entirely a *verification* pass (VoiceOver, braille
simulator, switch/keyboard navigation, Dynamic Type, Bold Text, Button Shapes, Increase
Contrast, Reduce Transparency, Reduce Motion, grayscale, dark mode, low-bandwidth/
offline conditions) — none of which can be exercised without a real iOS device or
simulator, unavailable in this environment (same limitation flagged in every prior
phase's results doc, going back to `PHASE_00_RESULTS.md`). I scoped this phase to the
subset that's actually fixable/verifiable from source: real bugs found via the
project's own `temp/07_VISUAL_AND_SOUND/SOUND_AUDIT_AND_REQUIREMENTS.md` audit doc, a
static check of `AdaptiveSection` usage for blank-heading risk, and wiring one piece of
genuinely dead code (`launchValidation.ts`) that this phase's own "TypeScript and
launch validation" bullet calls for. Everything requiring an actual device is written
up as a manual test list instead, same as every prior phase.

## Change log

### Sound wiring fixed (`src/context/SoundContext.tsx`)
The project's own audit doc flagged two real issues, both fixed:
- **Critical**: `unsave` and `session` both pointed at
  `sounds/xxx/picker-change.wav` — a scratch/staging folder (literally named "xxx",
  containing unapproved alternate takes), not a real broken path, but still not
  something that should ship. Copied the two distinct sounds actually needed out of
  that folder into the main `sounds/` directory with real names
  (`bookmark_removed.wav` for unsave, `session_start.wav` for the "new since last
  visit" chime) and repointed both. Deleted the now-unreferenced `sounds/xxx/` folder
  entirely.
- **Policy issue**: `confirm`/`select`/`back`/`magic` were hard-coded to always play
  regardless of the user's Sound Effects setting (an `ALWAYS_PLAY` bypass set). The
  audit doc explicitly calls this out as contradicting user control. Removed the
  bypass — every sound now uniformly respects `soundEffectsEnabled`.
- **Not touched**: the audit doc also flags `search_complete.wav` (4.21s) and
  `refresh.wav`/`screen_close.wav`/`magic.wav`/`welcome.wav` as too long for routine UI
  feedback, and recommends trimming. I have no audio-editing tool available in this
  environment (no `ffmpeg` on the machine) and can't responsibly fabricate a trimmed
  replacement — flagged in "Not done" below.
- **Not touched**: several sound files in the `sounds/` folder are unreferenced by any
  code (`back.wav`, `confirm.wav`, `download_complete.wav`, `newconfirmsound.mp3`,
  `refresh.wav`, `select.wav` — superseded by the "new*" variants actually wired). I
  proposed removing them as dead assets; you asked me not to, so they remain in the
  bundle unused. No functional impact either way — just unused weight.

### Dead code wired up: pre-launch validation (`DeveloperToolsScreen.tsx`)
`src/services/launchValidation.ts` (`runLaunchValidation`) was a complete, working
readiness-check function (enabled-source count, official-source presence, cached-item
count, settings sanity, failing-source detection) with zero call sites anywhere in the
app — confirmed via repo-wide search. Added a "Run Launch Validation" row to Developer
Tools that runs it against the live app state and displays a pass/warn/fail report
inline, plus a toast summary. This directly serves this phase's "Verify TypeScript and
launch validation" bullet with a real, usable tool instead of leaving it dead.

### Static verification (no code changes needed)
- **Adaptive sections never create blank headings**: audited both consumers of
  `AdaptiveSection` (`ForYouScreen.tsx`, `NewsScreen.tsx`) — every heading `Text` sits
  inside the same conditional as its section body, and `NewsScreen.tsx`'s one
  zero-content usage (`itemCount={0}`, the Editor's Note slot) is permanently gated
  shut with no heading rendered at all. No violation found.
- **User-owned content survives optimization**: `storage.ts`'s `applyStorageTiers`
  (Phase 06) exempts `isSaved` items from every tier transition unconditionally — this
  was verified again while touching this file this phase; no regression introduced.
- **Notification permission denial recovery**: `GazetteAlertsScreen.tsx` (Phase 08)
  already shows a banner with a working "Open Settings" button
  (`openNotificationSettings()` → `Linking.openURL("app-settings:")` on iOS) when
  permission is denied — re-verified the code path, unchanged this phase.

## Files changed
`src/context/SoundContext.tsx` (sound reference fixes, always-play bypass removed),
`sounds/bookmark_removed.wav` and `sounds/session_start.wav` (new, copied from the
retired `sounds/xxx/` folder), `sounds/xxx/` (deleted), `src/screens/
DeveloperToolsScreen.tsx` (Launch Validation wired in), `package.json`/`app.json`
(version → `2026.0.1`, iOS build number → `12`).

## Not done (deferred, not silently skipped)
- **On-device VoiceOver/braille/switch-control/Dynamic Type/Bold Text/Button Shapes/
  Increase Contrast/Reduce Transparency/Reduce Motion/grayscale/dark-mode/low-bandwidth
  passes** — every item in the spec that requires a real device or simulator. See the
  manual test list below, which enumerates each one concretely.
- **Trimming long sound effects** (`search_complete.wav` and others flagged in the
  audit doc) — no audio-editing tool available in this environment.
- **Removing unused duplicate sound assets** — proposed, declined; left in place.
- **A full line-by-line "every icon-only control has a label/role/state/hint" audit**
  across every screen — spot-checked the shared components (`PrefNavCard`, `PrefNavRow`,
  `FeedItemCard`, `StoryClusterCard`, etc.) that the overwhelming majority of the app's
  UI is built from, and all consistently mark decorative icons
  `accessibilityElementsHidden`/`importantForAccessibility="no-hide-descendants"`. A
  full per-screen audit is still worth doing on-device, where VoiceOver's actual output
  can be heard directly rather than inferred from source.

## Manual test list (needs a real device/simulator)
- [ ] VoiceOver: heading navigation on every major screen; no decorative icon is ever
      announced; combined cards read concisely; rotor actions work as labeled.
- [ ] Braille display/simulator: labels stay concise and stable (spot check
      `AnnouncementLevelPicker`'s "Simple" mode and `FeedItemCard`'s braille action list).
- [ ] Switch Control / external keyboard navigation across News, Explore, For You,
      Your Gazette, and the Startup Wizard.
- [ ] Dynamic Type at maximum size, Bold Text, Button Shapes, Increase Contrast, Reduce
      Transparency, Reduce Motion, and Smart Invert/grayscale — one pass each across the
      3 root tabs and Your Gazette.
- [ ] Dark mode pass across all 6 themes (system/light/dark/gazette/midnight/fantasy).
- [ ] Low-bandwidth/offline: confirm `OfflineBanner` appears appropriately and no screen
      hard-crashes when a refresh fails mid-flight.
- [ ] Focus restoration after dismissing every modal/pushed screen (Weather modal,
      Trip Companion form, About the Gazette's expandable cards, etc.) and two-finger
      scrub behavior on pushed screens.
- [ ] Run "Run Launch Validation" in Developer Tools on a populated install and confirm
      the report matches reality (enabled source count, cached item count, etc.).
Blocked on macOS/device access per `PHASE_00_RESULTS.md` — same limitation as every
prior phase.

## Exit criteria (from this phase's own spec)
- [x] Only approved, correctly-referenced sounds wired (the one real broken-reference-
      pattern found and fixed; scratch folder removed)
- [x] Sound Effects setting now uniformly respected (no bypass)
- [x] Adaptive sections verified to never produce blank headings
- [x] User-owned content survives optimization (re-verified, no regression)
- [x] Notification permission denial recovery verified working
- [x] `npm run typecheck` passes; launch validation is now a real, wired tool
- [ ] Full on-device accessibility/performance/dark-mode/offline pass — **not done**,
      needs a device (see manual test list)
