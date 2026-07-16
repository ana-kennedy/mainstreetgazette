# Phase 07 Results — Settings: Your Gazette

## Scope decision, up front
The flat 8-card Settings home (`SettingsScreen.tsx`) restructures into the spec's exact 5
groups. Research before writing code found most of the underlying screens already existed
and mostly needed regrouping/renaming, but a few real gaps and one recurring tension
shaped the actual scope:

- **Content requiring facts I don't have** (Terms of Use legal text, Credits/team names,
  open-source acknowledgements, accessibility statement) got clearly-labeled placeholder
  copy in expandable cards on the new `AboutGazetteScreen`, not fabricated as final —
  see "Not done" below for the exact list to replace with real copy.
- **Screens with no explicit slot in the 5-group spec** (`NewsPreferencesScreen`,
  the old `SourceMediaPreferencesScreen`'s content) were not deleted — the master
  prompt's rule is to preserve working functionality unless a phase explicitly replaces
  it, and neither was named for removal. `NewsPreferencesScreen` turned out to need no
  new entry point at all: the News tab's own gear icon already jumps directly there
  (confirmed in `NewsTabScreen.tsx`), bypassing Settings home entirely, both before and
  after this phase. `SourceMediaPreferencesScreen`'s real content (article/video open
  mode, reader mode, playback speed/skip/autoplay/streaming) was folded into the new
  `ReadingExperienceScreen` under "Gazette Reader"/"Playback" subsections rather than
  kept as a separate top-level screen or silently dropped.
- **Features the spec names that don't exist yet anywhere in the codebase** (Park Radio,
  Trip Companion) are shown as clearly-labeled "Coming Soon" rows with no backing
  setting — not a fabricated working toggle, matching the Phase 05 precedent for
  "Ready Offline." Trip Companion in particular is explicitly a Phase 08 / For You
  feature per `PHASE_08_ALERTS_AND_TRIP_COMPANION.md`; this row will be wired to a real
  destination once that phase builds it (later in this same session).
- **Card Density and Artwork** needed real 3-way enums per spec (standard/spacious/
  compact; full/reduced/text-first), which required extending `UserSettings` and a
  storage migration (old `"comfortable"` → `"standard"`; old real `showThumbnails`
  boolean folded into the new `artworkDensity` enum). `showArtwork` was confirmed dead
  code before this phase (defined, never read by any renderer) and was not migrated —
  only genuinely-consumed settings got migration logic.
- **My Magic's fixed 11-interest taxonomy** didn't fully exist in the shared
  content-classification taxonomy (`topic_taxonomy_v1.json`, also used for personalization
  ranking and article tagging elsewhere). Rather than inventing a second, disconnected
  taxonomy just for display, 6 new topics (Attractions, Festivals & Seasonal Events,
  runDisney, Disney Vacation Club, Disney History, Community Highlights) were added to
  the real taxonomy with actual keyword lists, so favoriting them is a genuine content
  filter, not a dead checkbox.

## Change log

### IA restructure
`SettingsScreen.tsx` rewritten: 5 sections (Your Experience / Gazette Library / Explore
Disney / Help & Support / About the Gazette) with the spec's exact title and intro copy
for each, using the existing `PrefSectionLabel`/`PrefNavCard` components — no new shared
UI primitives needed. `SettingsStackParamList` (`navigation/types.ts`) replaced
`Personalization`/`NotificationPreferences`/`SourceMediaPreferences`/`AppearanceStorage`/
`AdvancedAbout` with `MyMagic`/`GazetteAlerts`/`ReadingExperience`/
`GazetteLibrarySettings`/`ExploreDisneyPreferences`/`AboutGazette`/`DeveloperTools`;
`SourceLibrary`/`SourceManage`/`Analytics` stay as routes but are no longer linked from
Settings home. `RootNavigator.tsx`'s `SettingsStackNavigator` updated to match.

### My Magic (`MyMagicScreen.tsx`, new — replaces `PersonalizationScreen.tsx`)
Reuses `PersonalizationContext`'s existing `favoriteLocations`/`favoriteParks`/
`favoriteTopics`/`mutedTopics` arrays — no new data layer. Two spec-named sections:
- **Destinations**: the 5 fixed items (Walt Disney World/Disneyland Resort/Disney Cruise
  Line/International Parks/Disney Entertainment) as plain-string favorites, plus a
  secondary "Specific Parks" row (existing park-level favoriting, kept rather than
  dropped — the spec only names 2 top-level sections, so this nests under Destinations
  instead of becoming a third section or being deleted).
- **Interests**: the 11 fixed items, backed by real (6 newly added) taxonomy topics —
  see Scope decision above.
- Kept: "Hide From Favorites" (now sourced from the full, now-20-topic list) and the
  "why recommended" transparency toggle.
- Moved out: "Default News Feed" mode (→ `NewsPreferencesScreen`, since the spec
  explicitly says media type isn't an interest filter) and Notification
  Profile/Behavior (→ `GazetteAlertsScreen`, since those are about alerts).

### Gazette Alerts (`GazetteAlertsScreen.tsx`, new — replaces `NotificationPreferencesScreen.tsx`)
Straight rename plus absorbing the Notification Profile/Behavior sections moved out of
My Magic. Fixed the dead `onPress={() => {}}` "My News Profile" stub from the old
screen by making Notification Profile a real section on this same screen instead of a
non-functional nav row to nowhere. Phase 08 will further restructure this into the
spec's four named choices (Morning Edition/Special Editions/Disney Moments/Trip
Companion Alerts) — this pass only gets it its own Settings destination and real content.

### Reading Experience (`ReadingExperienceScreen.tsx`, new)
Theme (from the retired `AppearanceStorageScreen`), Card Density (3-way), Artwork
(3-way), Gazette Reader (article/video open mode + reader mode, from the retired
`SourceMediaPreferencesScreen`), Playback (speed/skip/autoplay/streaming, same
retirement), Sound (sound effects + haptics + Test Sounds panel, moved out of
Accessibility). **Deliberately not included**: text-size override and "seasonal
touches" — no real consumer exists to wire them to (Dynamic Type is OS-driven today,
no seasonal decoration system exists anywhere), and a standalone motion toggle beyond
the existing OS Reduce Motion read — adding dead toggles would violate the "never
expose an empty promise" rule already established in this codebase's own history.

### Accessibility (`AccessibilityPreferencesScreen.tsx`, trimmed)
Card Density and the entire Motion & Sound section (+ Test Sounds panel) moved out to
Reading Experience per the spec's 2-screen split; VoiceOver and Vision sections
untouched.

### Gazette Library settings (`GazetteLibrarySettingsScreen.tsx`, new — distinct from the
Phase 05 `GazetteLibraryScreen.tsx`, which is the actual saved-items browse screen in the
For You tab)
My Collections (a shortcut that navigates into the For You tab's real library screen),
Ready Offline (Coming Soon — no downloads system exists, confirmed in Phase 05), Storage
(the Phase 06 `optimizeStorageAutomatically`/`growLibraryWifiOnly` settings, replacing
the old literal day-count picker and "Clear Article Cache" button — the spec explicitly
says never show a cache-retention duration), iCloud Sync (relocated unchanged from
`AppearanceStorageScreen`), and a plain-language library explanation using the required
"continues to grow as you explore" phrasing from Phase 06.

### Explore Disney (`ExploreDisneyPreferencesScreen.tsx`, new)
Dashboard opening preference (new `exploreOpeningView` setting, 5 options, wired to
nothing yet beyond storage — `ParksHome`'s existing `initialView` param isn't touched by
this Settings-only phase, so the setting is real but not yet consumed; flagged below).
Weather units (new `weatherUnit` setting: auto/Fahrenheit/Celsius) — this one **is**
fully wired: `weatherService.ts` gained `resolveWeatherUnit()`/unit-aware
`tempDisplay()`/`tempAccessText()`, and both real consumers (`WeatherModal.tsx`,
`ParksScreen.tsx`) now respect it instead of always showing both units. Park Radio and
Trip Companion: Coming Soon rows, no backing settings (features don't exist).

### About the Gazette (`AboutGazetteScreen.tsx`, new — replaces `AdvancedAboutScreen.tsx`)
This Edition (version/build, reused from the old screen), a real Data Sources section
grounded in what the app actually calls (themeparks.wiki for park info, Open-Meteo +
National Weather Service for weather — see `parksService.ts`/`weatherService.ts`),
Privacy (reused), Terms of Use/Credits/Open-Source/Accessibility Statement as
expandable cards with clearly-generic placeholder copy (not dead nav rows — tapping
them expands real, honestly-labeled placeholder text rather than going nowhere), and
Share the Gazette (wired to the native share sheet). Diagnostics and Apple Intelligence
toggles moved to `DeveloperToolsScreen`.

### Developer unlock (new)
Tapping the "This Edition" card 7 times within 2 seconds on `AboutGazetteScreen`
navigates to the new `DeveloperToolsScreen`, which hosts Source Library, Manage Sources,
Feed Health (Analytics), Rebuild Feed Index, and the Apple Intelligence toggles — all
reused unchanged from the retired `AdvancedAboutScreen`/old Settings home, just
re-parented behind the unlock instead of linked from normal Settings.

### Weather unit support (contained, real feature)
`weatherService.ts`: `WeatherDisplayUnit` type, unit-aware `tempDisplay`/`tempAccessText`
(default `"both"` preserves old behavior for any caller that doesn't pass a unit),
`resolveWeatherUnit()` (auto = follow device region via `expo-localization`, already a
dependency). Threaded through every real call site in `WeatherModal.tsx` and
`ParksScreen.tsx` (`buildTodayGlanceItems` gained a `weatherUnit` parameter).

## Files changed
New: `MyMagicScreen.tsx`, `GazetteAlertsScreen.tsx`, `ReadingExperienceScreen.tsx`,
`GazetteLibrarySettingsScreen.tsx`, `ExploreDisneyPreferencesScreen.tsx`,
`AboutGazetteScreen.tsx`, `DeveloperToolsScreen.tsx`.
Deleted: `PersonalizationScreen.tsx`, `NotificationPreferencesScreen.tsx`,
`AppearanceStorageScreen.tsx`, `SourceMediaPreferencesScreen.tsx`,
`AdvancedAboutScreen.tsx`.
Edited: `SettingsScreen.tsx` (full rewrite), `AccessibilityPreferencesScreen.tsx`
(trimmed), `NewsPreferencesScreen.tsx` (gained the relocated feed-mode picker),
`AccessibilityGuideScreen.tsx`/`UserGuideScreen.tsx` (optional route params for
Help & Support's deep links), `FeedItemCard.tsx`/`StoryClusterCard.tsx` (density/artwork
enums), `weatherService.ts`/`WeatherModal.tsx`/`ParksScreen.tsx` (weather units),
`NewsTabScreen.tsx` (fixed a stale `navigate("Personalization")` reference),
`src/domain/models.ts` (new types/fields), `src/services/storage.ts` (migrations),
`src/navigation/types.ts`/`RootNavigator.tsx`, `src/assets/data/knowledge/topic_taxonomy_v1.json`
(+6 topics), `src/i18n/locales/en.json`.

## Not done (deferred, not silently skipped)
- **Real Terms of Use / Credits / Open-Source / Accessibility Statement copy** —
  placeholder text in expandable cards on `AboutGazetteScreen`; needs real content.
- **Dashboard opening preference isn't consumed yet** — `exploreOpeningView` is stored
  and has a real picker, but nothing reads it to actually change what the Explore tab
  opens to (that's `DiscoverTabScreen`/`ParksHome` wiring, arguably Explore-tab-redesign
  territory rather than Settings — flagged as a gap for whichever phase touches that
  screen next).
- **Text-size override, seasonal touches, standalone motion toggle** — no real feature
  to back them; not exposed.
- **Park Radio, Trip Companion** — Coming Soon rows; Trip Companion gets wired once
  Phase 08 builds it (this session, next).
- **3 fully separate VoiceOver/Low Vision/Braille guide screens** — implemented as one
  `AccessibilityGuideScreen` with a `section` route param instead of 3 new screens,
  reusing the existing article-accordion pattern and content.

## Migration notes
- `UserSettings.cardDensity`: old `"comfortable"` value migrated to `"standard"` in
  `storage.ts`'s `loadSettings()`.
- `UserSettings.artworkDensity` (new): derived from the old, real `showThumbnails`
  boolean for existing installs (`false` → `"textFirst"`, otherwise → `"full"`); the old
  `showArtwork` boolean was confirmed dead code (never read) and isn't part of this
  migration.
- `UserSettings.optimizeStorageAutomatically`/`growLibraryWifiOnly`/`exploreOpeningView`/
  `weatherUnit`: new fields, default via the existing `{ ...defaultUserSettings,
  ...stored }` merge — no explicit migration code needed.
- No persisted route names leak into user-facing state (Settings navigation state isn't
  persisted across launches in this app), so renaming/removing routes needed no
  migration beyond fixing the one stale in-code reference found (`NewsTabScreen.tsx`'s
  "Open Favorites Setup" action, now pointing at `MyMagic`).

## Manual test list
- [ ] From each of the 3 root tabs (News/Explore/For You), tap the gear icon and confirm
      it lands on the expected screen (News → straight to News & Timeline; Explore/For
      You → Settings home showing all 5 groups).
- [ ] Open every card under each of the 5 groups and confirm it reaches a real screen
      (no dead ends except the explicitly-labeled "Coming Soon" rows).
- [ ] In My Magic, select a Destination and an Interest, confirm they persist after
      restarting the app, and confirm News' Favorites view reflects the pick.
- [ ] In Reading Experience, cycle Card Density through all 3 states and Artwork through
      all 3 states; confirm News feed cards visibly change padding/thumbnail size.
- [ ] In Gazette Library settings, toggle "Optimize Automatically" off, confirm the
      plain-language note appears; toggle "Only Grow Your Library on Wi-Fi."
- [ ] In Explore Disney, change Weather Units to Celsius/Fahrenheit/Follow iPhone and
      confirm the Explore tab's weather modal and today's-glance line update accordingly.
- [ ] On About the Gazette, tap "This Edition" 7 times quickly and confirm Developer
      Tools opens; confirm it is NOT reachable from anywhere else.
- [ ] VoiceOver pass over the new Settings home: confirm each of the 5 group labels and
      intro sentences read as real headings/text, and every card has a clear label + hint.
Blocked on macOS/device access per `PHASE_00_RESULTS.md` — I ran `npm run typecheck`
(passes cleanly) and traced every navigation path/setting read-write by hand; on-device
VoiceOver and visual verification are for you.

## Exit criteria (from this phase's own spec)
- [x] Gear icon entry point unchanged, "Your Gazette" page title
- [x] Exactly 5 groups, spec-exact titles and intro copy
- [x] No Settings bottom tab (already true, unchanged)
- [x] No normal-user Source Library/RSS management/analytics/feature flags/cache
      duration/developer diagnostics — all moved behind the developer unlock
- [x] Developer tools behind an intentional unlock, not a visible entry
- [~] Full section content — real except for the explicitly-flagged placeholder copy
      (Terms/Credits/Open-Source/Accessibility Statement) and two Coming Soon features
      (Park Radio, Trip Companion) with no backing implementation yet
