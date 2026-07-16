# Phase 08 Results — Gazette Alerts and Trip Companion

## Scope decision, up front
Research before writing code found two very different starting points for this phase's
two halves:

- **Gazette Alerts** already had real, working settings (`breakingNewsEnabled`,
  `dailyDigestEnabled`, quiet hours, notification profile/behavior) and a real scoring
  engine (`src/intelligence/phase9`) — but **zero actual OS notification delivery**.
  `backgroundTask.ts` computed a full `NotificationBatch` every run and then discarded
  it (`void batch;`, with a comment saying "install expo-notifications" to make it
  real). The acceptance checklist's "Denied notification permission can be recovered
  through iPhone Settings" bar only makes sense if permission-checking is real, so I
  added `expo-notifications` and wired actual local-notification delivery rather than
  just relabeling toggles — this is real new infrastructure, not a rename.
- **Trip Companion** had zero existing scaffolding. `CompanionModeContext` (an "I'm
  physically at the park right now" session toggle) and `phase22`'s
  `buildTripPlanningIntelligence` (per-park news tips, not user trips) are both
  confirmed different features — neither was touched or repurposed. Trip Companion is
  a fully new, separate data model, context, screen, and reminder engine.
- **"Optional linked collection"**: this app has no user-authored-collection model
  (confirmed in `PHASE_05_RESULTS.md`) — only follow/unfollow of existing editorial or
  automatic collections. So linking a trip to a collection means referencing an
  existing collection id, not creating a new one. Implemented that way, with an
  explicit consent checkbox before the link is saved, per spec.
- **Reminder engine dates**: I did not have verified, current Disney policy for exact
  day-counts (dining windows, Lightning Lane timing, etc.), so rule copy is hedged
  ("typically... check the official app for exact timing") rather than stated as fact —
  the versioning/effective-date/destination-scope *mechanism* the spec asks for is
  real and complete; the specific day-counts in `reminderRules.json` should be
  reviewed against current official policy before shipping.

## Change log

### Real local notification delivery (new `src/services/pushNotifications.ts`)
Added `expo-notifications` (registered in `app.json`'s plugins array — while there I
also fixed a stray invalid-JSON artifact at the end of `app.json` that would have
broken `expo start`/builds entirely, unrelated to this phase but blocking either way).
`pushNotifications.ts` wraps permission check/request, immediate delivery
(`scheduleNotificationAsync` with `trigger: null`), date-scheduled delivery (used by
Trip Companion reminders), and `openNotificationSettings()` (the spec's "Open iPhone
Settings" recovery action — `Linking.openURL("app-settings:")` on iOS, `Linking.
openSettings()` elsewhere). Permission is requested **only** from `GazetteAlertsScreen`'s
toggle handler, in direct response to the user turning a choice on — never at launch,
never during onboarding (verified: it's the only call site of
`requestNotificationPermission` anywhere in `src/`).

`backgroundTask.ts` now actually delivers `evaluateNotifications`'s output instead of
discarding it: `batch.immediate` and `batch.digest` are sent via
`sendImmediateNotification` (a no-op if permission isn't granted). Added
`storage.ts`'s `loadNotifiedClusterIDs`/`addNotifiedClusterIDs` (capped at 500) so the
same story isn't re-notified on every ~15-minute background run — threaded into
`evaluateNotifications`'s existing `seenClusterIDs` parameter, which was already there
but previously unused by the background task.

### Gazette Alerts restructured into 4 named choices (`GazetteAlertsScreen.tsx`)
- **Morning Edition** → `dailyDigestEnabled` (existing, real)
- **Special Editions** → `breakingNewsEnabled` (existing, real — already gated in
  `phase9` by `breakingScore >= 70` AND `sourceCount >= 3`, i.e. already a genuine
  high-confidence multi-source rule, not a delayed single-poll result relabeled)
- **Disney Moments** → new `disneyMomentsEnabled` setting, backed by a real (not
  fabricated) addition to `phase9`: a cluster that doesn't earn breaking/official/
  entity/park status but matches one of the gentle topics added in Phase 07
  (`disney_history`/`festivals_seasonal`/`community_highlights`) is now tagged a new
  `"disney_moment"` type and suppressed unless this toggle is on.
- **Trip Companion Alerts** → new `tripCompanionAlertsEnabled` setting, gating whether
  `TripCompanionScreen` schedules real date-based local notifications for a trip's
  reminders.
Each choice shows its required one-sentence description. A permission-denied banner
with an "Open Settings" button appears above the choices when notifications are off at
the OS level. Notification Profile and Notification Behavior sections (moved here from
the old PersonalizationScreen in Phase 07) are unchanged.

### Trip Companion (new: `TripCompanionContext.tsx`, `TripCompanionScreen.tsx`, `Trip` model)
Lives in the For You tab (new `TripCompanion` route on `ForYouStackParamList`), with a
management link from Explore Disney settings (now wired for real, replacing the Phase
07 "Coming Soon" placeholder) and an always-visible "Trip Companion" section on the For
You root (shows the nearest upcoming trip, or a "Plan a Trip" prompt — not gated by
`AdaptiveSection` since it's a discoverability entry point, not content that can be
"weak"). Fields exactly per spec: destination (WDW/DLR/DCL/International — "Disney
Entertainment" from My Magic's taxonomy was excluded here since it isn't a travel
destination), start date, end date, optional resort, optional notes, optional linked
collection with an explicit consent checkbox. Supports multiple trips (`Trip[]`
persisted as a flat array). **Known gap**: date entry is a validated `YYYY-MM-DD` text
field, not a native date picker — no date-picker dependency existed in this project;
adding one is a reasonable follow-up rather than a blocker for the underlying feature.

### Reminder engine (new: `src/services/reminderEngine.ts`, `src/data/phase24/reminderRules.json`)
Follows this codebase's existing JSON-data-file pattern (like `data/phase13/events.json`)
rather than the hard-coded `rules.ts` constants pattern used elsewhere in `intelligence/`
— the spec explicitly warns against the latter for mutable policy. The JSON file has a
top-level `version`/`effectiveDate` and each rule has a `destinationScope` array and
`daysBeforeStart` offset; `computeTripReminders(trip)` resolves offsets against a
specific trip's `startDate` into real calendar dates, and `scheduleTripReminders`/
`cancelTripReminders` turn those into real local notifications (only actually delivered
if `tripCompanionAlertsEnabled` is on and OS permission is granted). Five rule types
shipped: dining window, Lightning Lane window, check-in (resort-only, gated on
`requiresResort`), weather usefulness, and park-hour review — see Scope decision above
re: day-count accuracy.

## Files changed
New: `src/services/pushNotifications.ts`, `src/services/reminderEngine.ts`,
`src/data/phase24/reminderRules.json`, `src/context/TripCompanionContext.tsx`,
`src/screens/TripCompanionScreen.tsx`.
Edited: `src/screens/GazetteAlertsScreen.tsx` (restructured into 4 choices + permission
UI), `src/intelligence/phase9/types.ts`/`rules.ts`/`service.ts` (Disney Moments type +
scoring branch), `src/services/backgroundTask.ts` (real delivery + seen-cluster
tracking), `src/services/storage.ts` (notified-cluster-ID tracking, trip persistence),
`src/domain/models.ts` (`Trip` interface, 2 new settings fields),
`src/screens/ExploreDisneyPreferencesScreen.tsx` (Trip Companion link wired for real),
`src/screens/ForYouScreen.tsx`/`ForYouTabScreen.tsx` (Trip Companion entry point),
`src/navigation/types.ts`/`RootNavigator.tsx` (`TripCompanion` route), `App.tsx`
(`TripCompanionProvider`), `package.json` (`expo-notifications`), `app.json` (plugin
entry + fixed a pre-existing invalid-JSON artifact unrelated to this phase).

## Not done (deferred, not silently skipped)
- **Native date picker** for Trip Companion — text-field date entry (`YYYY-MM-DD`) with
  format validation instead; no date-picker dependency existed in this project yet.
- **Reminder rule day-counts are not verified against current official policy** — the
  mechanism (versioned, dated, destination-scoped JSON) is real; the specific numbers
  need a policy review before shipping, and are hedged in the user-facing copy in the
  meantime.
- **Remote/push notifications** — only on-device local scheduling was added
  (`scheduleNotificationAsync` with `trigger: null` or a future date). No push token,
  no server-side delivery. Sufficient for both current use cases (immediate news
  alerts computed by the background task, and date-scheduled trip reminders), since
  neither needs a remote server.
- **Special Editions' "high-confidence major event rule"** reuses the existing
  `breakingScore >= 70 && sourceCount >= 3` gate from Phase 9 rather than introducing a
  second, parallel definition of "major event" — this was a deliberate choice to avoid
  two competing "is this important" rules; flagging in case the spec intends something
  stricter specifically for the renamed "Special Editions" category.

## Migration notes
- `UserSettings.disneyMomentsEnabled` (default `false`) and `tripCompanionAlertsEnabled`
  (default `true`) — new fields, default via the existing settings merge, no explicit
  migration needed.
- `NotificationType`/`NotificationSuppressReason` gained new enum members
  (`"disney_moment"`/`"disney_moments_disabled"`) — additive, no migration needed for
  any persisted data (these are computed at evaluation time, never stored).
- New AsyncStorage keys (`mainstreetgazette.notifiedClusterIDs`,
  `mainstreetgazette.trips`) default to empty arrays for all existing installs.

## Manual test list
- [ ] In Gazette Alerts, turn on each of the 4 choices one at a time on a fresh install
      (permission not yet granted) — confirm the OS permission prompt appears exactly
      once, only on that first toggle-on, never before.
- [ ] Deny notification permission, confirm the red banner and "Open Settings" button
      appear and that tapping it opens the iOS Settings app to this app's page.
- [ ] Grant permission, trigger a background refresh with a known breaking/official
      story in the feed, confirm a real notification arrives; confirm it does NOT
      arrive again on the next background run (already-notified tracking).
- [ ] Enable Disney Moments, confirm a cluster tagged with a "gentle" topic (Disney
      History/Festivals/Community Highlights) produces a notification only when this
      toggle is on, not when off.
- [ ] In the For You tab, confirm the Trip Companion section shows "Plan a Trip" with
      no trips, and switches to showing the nearest trip's destination/dates after
      adding one.
- [ ] Add a trip with Trip Companion Alerts on and permission granted; confirm the
      upcoming reminders list on the trip card matches `reminderRules.json` and that
      real notifications are scheduled (check via device Settings or by setting a trip
      date close enough that a reminder fires within a testing window).
- [ ] Remove a trip, confirm its scheduled reminders are canceled (no stray
      notifications arrive after deletion).
- [ ] From Explore Disney settings, confirm "Manage Your Trips" reaches the same For
      You Trip Companion screen (not a separate copy).
- [ ] VoiceOver pass over Gazette Alerts (each choice's switch role/description) and
      Trip Companion (form fields, consent checkbox, trip cards).
Blocked on macOS/device access per `PHASE_00_RESULTS.md` — I ran `npm run typecheck`
(passes cleanly), verified the `expo-notifications` API surface against the installed
package's type definitions, and traced every code path by hand; on-device permission
prompts, actual notification delivery, and VoiceOver behavior are for you to verify.

## Exit criteria (from this phase's own spec / acceptance checklist)
- [x] Gazette Alerts: 4 named choices, each with a one-sentence description
- [x] Denied notification permission recoverable through iPhone Settings (real
      permission check + real recovery action)
- [x] Trip Companion: start/end date fields and multiple trips work
- [x] Reminder rules are versioned and destination-aware
- [x] Notification permission never forced — only requested from an explicit toggle
- [~] Reminder rule day-counts need a policy accuracy review before shipping (mechanism
      is real; specific numbers are hedged placeholders)
