# Phase 09 Results — Startup Wizard: The Gazette Arrival

## Scope decision, up front
Research before writing code found the existing `OnboardingScreen.tsx` was a 5-step
wizard (Welcome → Sources → Preferences → Favorites → Done) using an older, narrower
taxonomy (`LocationFilterKey`, missing "Disney Entertainment") and asking questions the
new 9-page spec doesn't ask at all (which source *types* to enable, cache window days).
Rather than editing it in place, I built a new `StartupWizardScreen.tsx` implementing
the spec's exact 9 pages, gated behind the `startupWizardEnabled` feature flag (already
defined in `featureFlags.ts` since an earlier phase, never read anywhere until now) —
flipped to default `true` this phase, following this codebase's established "ship dark,
cut over" convention for every other redesigned surface. `OnboardingScreen.tsx` is kept,
unmodified, as the flagged-off fallback rather than deleted, per the master prompt's
"don't remove legacy functionality until its replacement is tested" rule.

Key decisions:
- **Reused real content instead of re-deriving it**: My Magic's destination/interest
  taxonomy (`DESTINATION_IDS`/`INTEREST_IDS`, now exported from `MyMagicScreen.tsx`),
  Gazette Alerts' four named choices verbatim (`ALERT_CHOICES`, now exported from
  `GazetteAlertsScreen.tsx`), and the Living Gazette Library's approved
  `t("library.growing")` string. This means the wizard and the real settings screens
  can never drift apart on wording — one source of truth for each.
- **Confirmed and preserved**: nothing in the new wizard calls
  `requestNotificationPermission()`/`getNotificationPermissionState()` — the Gazette
  Alerts page stores the four choices as plain preference values only; the actual OS
  permission prompt still only ever fires from `GazetteAlertsScreen` itself, in
  response to a user explicitly toggling a switch there later. Verified this is the
  only call site of `requestNotificationPermission` in the whole codebase.
- **Dropped, not silently carried forward**: source-type toggles (articles/videos/
  podcasts/Reddit) and cache-window-days picker from the legacy wizard — the new
  9-page spec doesn't ask either question, so all bundled sources default to their
  catalog `isDefaultEnabled` value and cache/storage defaults are untouched, rather than
  inventing extra onboarding questions beyond what the spec names.
- **"Motion" (page 7, "Make the Gazette Yours")**: Phase 07 already determined no real,
  independent motion setting exists beyond the OS Reduce Motion read (a standalone
  toggle was deliberately not built then, for lack of a real consumer). Rather than
  fabricate one just for this page, page 7 states plainly that motion always follows
  the device's Reduce Motion setting automatically — an honest description of current
  behavior, not a new control.
- **"Take the Grand Tour"**: found `FirstTimeTour.tsx` — a fully-built, working stepped
  tour component that was **never rendered or wired anywhere** in the app (confirmed via
  repo-wide search) and whose content was stale (5 tabs: News/Explore/Search/
  Collections/Preferences, from before the 3-tab redesign). Rewrote its step content
  for the current News/Explore/For You IA and wired it into `App.tsx` as the wizard's
  optional final action, rather than building a second tour mechanism from scratch.

## Change log

### New `StartupWizardScreen.tsx`
9 pages exactly per spec, each with a real heading, a one-paragraph description, and
(where applicable) real controls:
1. **Welcome to Main Street Gazette** — `Begin Today's Edition` to advance.
2. **A Newspaper for Disney Fans** — explains mixed content types and official/
   independent sourcing, in plain language (no "RSS"/"sources"/"feed" jargon, per the
   Constitution's word-avoid list).
3. **My Magic** — the real Destinations/Interests multi-select from `MyMagicScreen.tsx`,
   writing directly to `PersonalizationContext` (same as the legacy wizard's favorites
   step did) — explicitly optional, described as changeable later.
4. **The Living Gazette Library** — the approved `library.growing` string.
5. **Save the Magic** — explains the single Save action and Collections in plain terms.
6. **Gazette Alerts** — the four real named choices with working switches, stored as
   preferences only; no permission prompt (see Scope decision above).
7. **Make the Gazette Yours** — a 3-option theme picker (Auto/Light/Dark — the fuller
   6-theme grid lives in Reading Experience for later), Sound Effects, VoiceOver-
   Optimized Layout (auto-defaults on if a screen reader is already running, matching
   legacy behavior), High Visual Contrast, and a plain statement about Reduce Motion.
8. **Meet Your Gazette** — one-line descriptions of News/Explore/For You.
9. **Your First Edition Is Ready** — `Open Today's Gazette` (primary) and
   `Take the Grand Tour` (secondary) actions.

`onComplete(sources, settings)` keeps the exact same signature as the legacy
`OnboardingProps`, so `AppContext.completeOnboarding` and `App.tsx`'s wiring needed no
changes beyond adding the new component as an alternate branch.

### Grand Tour (`FirstTimeTour.tsx`, rewritten content; `App.tsx`, newly wired)
Step copy rewritten for the current 3-tab IA plus a "gear icon → Your Gazette" step
(replacing the old Preferences-tab step, since Settings is no longer a tab). Wired into
`App.tsx`: a new `showGrandTour` state renders `<FirstTimeTour visible={showGrandTour}
onComplete={() => setShowGrandTour(false)} />` inside the main app tree (previously this
component was imported nowhere); the wizard's `onRequestGrandTour` callback sets that
state to true right after `onComplete` finishes onboarding, so the tour appears
immediately over the freshly-loaded main app.

### Feature flag cutover
`startupWizardEnabled` (`featureFlags.ts`) flipped from `false` to `true` — this is now
the default first-run experience; `App.tsx` reads the flag (via the existing
`getFlagBool`, respecting any developer-tools override) and falls back to the untouched
legacy `OnboardingScreen` if it's off.

## Files changed
New: `src/screens/StartupWizardScreen.tsx`.
Edited: `src/components/FirstTimeTour.tsx` (step content rewrite for current IA),
`App.tsx` (flag read, wizard branch, Grand Tour wiring), `src/services/featureFlags.ts`
(`startupWizardEnabled` default flip), `src/screens/MyMagicScreen.tsx` (exported
`DESTINATION_IDS`/`INTEREST_IDS`), `src/screens/GazetteAlertsScreen.tsx` (exported
`ALERT_CHOICES`/`AlertChoice`).
Unchanged (kept as the flagged-off fallback): `src/screens/OnboardingScreen.tsx`.

## Not done (deferred, not silently skipped)
- **No wizard-specific copy existed in `temp/08_COPY_AND_CONTENT/`** — page copy was
  drafted fresh against the Constitution's word-avoid list (no "RSS"/"feed"/"cache"/
  "sync"/"source library"), but hasn't been reviewed by whoever maintains that approved-
  copy doc. Worth a copy pass before shipping.
- **No wizard-specific section exists in `MASTER_ACCEPTANCE_CHECKLIST.md`** — this
  phase's own manual test list below covers the gap; consider adding a dedicated
  checklist section.
- **Text-size override / seasonal touches** — consistent with Phase 07, not surfaced
  anywhere, including here, since no real feature backs them yet.
- **Sources step dropped** — new installs get exactly the catalog's default-enabled
  sources with no onboarding choice, matching the new spec's page list; if a "choose
  your source mix" step is still wanted somewhere, it needs a spec decision, not a
  silent addition here.

## Migration notes
- No persisted-data shape changes. `onComplete`'s signature is identical to the legacy
  wizard's, so `AppContext.tsx`/`App.tsx` needed no data migration — only a new render
  branch.
- Existing users (past first launch) are entirely unaffected — this phase only touches
  the first-launch branch in `App.tsx`.
- `startupWizardEnabled`'s default flip only matters for *new* installs from this point
  forward (the flag is read once, at first launch, when `app.isFirstLaunch` is true);
  no existing install's stored flag overrides are touched.

## Manual test list
- [ ] Fresh install (or clear app data), confirm the new 9-page wizard appears, not the
      legacy 5-step one.
- [ ] Walk all 9 pages forward and Back; confirm progress dots and VoiceOver step
      announcements stay in sync.
- [ ] On the My Magic page, pick a couple of destinations/interests, finish onboarding,
      and confirm they appear already selected in the real My Magic settings screen.
- [ ] On the Gazette Alerts page, toggle a couple of choices on, finish onboarding, and
      confirm: (a) the real Gazette Alerts settings screen shows the same values, and
      (b) no system notification permission dialog appeared at any point during
      onboarding.
- [ ] On the last page, tap "Open Today's Gazette" — confirm it lands directly in News
      with no tour.
- [ ] Restart onboarding (clear app data again), this time tap "Take the Grand Tour" —
      confirm the app loads AND the Grand Tour overlay appears immediately after,
      walking News/Explore/For You/gear-icon, and that Skip/Done both dismiss it cleanly.
- [ ] Turn on VoiceOver before starting onboarding, confirm "VoiceOver-Optimized Layout"
      arrives pre-enabled on the "Make the Gazette Yours" page.
- [ ] Turn `startupWizardEnabled` off via developer tools (if reachable pre-onboarding
      in your test setup) and confirm the legacy `OnboardingScreen` still works
      unmodified.
Blocked on macOS/device access per `PHASE_00_RESULTS.md` — I ran `npm run typecheck`
(passes cleanly) and traced every prop/callback path by hand; on-device VoiceOver
announcements, screen-reader auto-detection, and the Grand Tour's visual overlay timing
are for you to verify.

## Exit criteria (from this phase's own spec)
- [x] 9 pages, in spec order, each with a real heading and description
- [x] My Magic optional and clearly described
- [x] Living Gazette Library explains usefulness grows over time (reuses approved string)
- [x] Gazette Alerts explains choices, never forces system permission
- [x] Make the Gazette Yours: accessibility, sound, contrast covered; motion explained
      honestly rather than a fabricated toggle
- [x] Meet Your Gazette: News/Explore/For You
- [x] Final optional "Take the Grand Tour" action, now real and wired (previously
      dead code)
- [x] No unexplained jargon (checked against the Constitution's word-avoid list)
