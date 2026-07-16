# Phase 05 Results — For You, Gazette Library, and Collections

## Scope decision, up front
Research before writing code found: `app.toggleSaved` is already a clean, single, unified save
action (never prompts for a collection — the "one Save action" requirement was already true at
the data layer); but there is no user-created-collection system at all (only follow/unfollow of
editorial or auto-generated collections — no create/rename/pin/reorder/move/delete), no working
"downloads" feature (the old Downloads tab was 100% hardcoded to always render empty), and no
wired-up resume/reading-progress tracking for articles (a `readingHistory.ts` module exists but
nothing in the app ever calls it). Building full collection CRUD, a real downloads/offline
system, or a fabricated "continue reading" out of data that doesn't actually track completion
are each substantial, separate features. I scoped this phase to what's real and honest — see
"Not done" below for the rest.

## Change log

### For You root replaced: 4-tab switcher → 3 headings
`ForYouScreenCore` no longer has a `saved`/`queue`/`following`/`downloads` tab selector. It now
renders three sections, each wrapped in `AdaptiveSection` (Phase 01) so it disappears when
empty, each a real heading:

- **Continue Your Adventure** — genuinely resumable content only. Sourced from
  `loadPlaybackProgress()` (already-working podcast position tracking in `PlaybackContext`/
  `storage.ts`), filtered to `!isCompleted && positionSeconds > 5`, sorted by most recently
  played. **Deliberately does not include articles.** `readingHistory.ts`'s
  `recordArticleOpen`/`updateReadingProgress` exist but nothing calls `updateReadingProgress`
  anywhere in the app, so `isCompleted` would stay `false` forever for every article ever
  opened — meaning "not completed" would really mean "every article you've ever read," not
  "in progress." Surfacing that as "Continue Your Adventure" would violate the spec's own
  instruction to "show only genuinely resumable content." Wiring real per-article progress
  tracking (which needs scroll-position measurement in `FeedDetailScreen`, since there's no
  full article text to measure progress against — see PHASE_03_RESULTS.md) is flagged as a
  prerequisite, not done here.
- **The Gazette Library** — shows up to 6 recently-saved items (no "saved at" timestamp exists
  on `FeedItem`, so this sorts by publish date among saved items) plus an "Open the Gazette
  Library" action. It does **not** dump the full saved list on the root anymore.
- **Today's Picks** — reuses the exact personalization ranking News' My Magic view already
  uses (`rankPersonalizedStories`/`clusterToStoryClusterLike`) rather than building a second
  recommendation system. Hidden entirely when the guest has no favorites configured (matches
  "hide when recommendations are weak").

### New screen: `GazetteLibraryScreen.tsx` (route `GazetteLibrary` on `ForYouStackParamList`)
The actual "browse everything" destination "Open the Gazette Library" leads to — the full
saved-items list (moved here from the old `saved` tab) plus a "My Collections" section (moved
here from the old `following` tab's collections half, using the same `useCollections`/
`buildAllCollections` data). This is a relocation of existing, working rendering logic into its
own screen, not new data plumbing.

### Closed a gap flagged in Phase 03
`ForYouStackParamList` had no `StoryDetail` route (confirmed dead — nothing tried to navigate
there). Today's Picks needs to link to multi-source clusters, so I added the route (mirrors
`NewsStackParamList`/`DiscoverStackParamList` exactly) rather than avoid clusters in this
section. This closes the gap noted in `PHASE_03_RESULTS.md` as a side effect of needing it.

### Dropped, not hidden: the old `following` tab's source list, and the `downloads` tab
- The "Followed Sources" list (plain text rows, no press action, no unfollow-from-there) had
  essentially no functionality to begin with and is exactly the kind of source-library language
  the Constitution wants out of primary UI — removed, not relocated.
- The `downloads` tab was **always** empty by construction (`data={[]}` hardcoded, `FeedItem
  .isDownloaded`/`.downloadState` are never set to anything but `false`/`"notDownloaded"`
  anywhere in `feedEngine.ts`) — removing a feature that never worked is Constitution rule 4
  ("never expose an empty promise") compliance, not a regression.
- The podcast **queue** (`playback.queue`, a real, working manual "up next" list) lost its tab,
  but I did not build a replacement entry point — `MiniPlayer` is rendered globally in
  `App.tsx` and already provides a persistent path into `PlayerScreen` from any tab, so queue
  access isn't stranded.

## Files changed
- `src/screens/ForYouScreen.tsx` — full rewrite (3-section layout, replaces 4-tab switcher).
- `src/screens/ForYouTabScreen.tsx` — updated prop wiring (`onNavigateToStoryDetail`,
  `onOpenLibrary`; removed `onNavigateToCollectionDetail`/`onManageSources`).
- `src/screens/GazetteLibraryScreen.tsx` — new.
- `src/navigation/types.ts` — `ForYouStackParamList` gains `GazetteLibrary: undefined` and
  `StoryDetail: { clusterId: string }`.
- `src/navigation/RootNavigator.tsx` — registers both new routes on `ForYouStackNavigator`.
- `src/i18n/locales/en.json` — replaced `forYou.tabs.*`/tab-specific keys with
  `forYou.continueAdventure`/`gazetteLibrary`/`openLibrary`/`todaysPicks`/etc.; new `library.*`
  namespace for the new screen.

## Not done (deferred, not silently skipped)
- **Full collection CRUD** (create/rename/reorder/pin/move/copy/delete user-created
  collections like "Vacation 2027" or "Restaurants to Try") — this is the single biggest gap
  against this phase's spec. Today's collection system only supports following/unfollowing
  editorial or auto-generated collections; there is no user-authored collection concept
  anywhere in the data model. This needs a new persisted data model before any UI is
  meaningful, not a screen-level change.
- **Smart shelves**: Enjoy Later, Continue Reading, Continue Watching, Recently Added, Ready
  Offline. "Continue Watching" has no backing data (no video playback exists, per
  PHASE_03_RESULTS.md). "Ready Offline" has no backing data (confirmed: no download service
  exists anywhere). "Enjoy Later"/"Recently Added" are reasonable filters over existing saved
  items and are the most achievable of this list — left for a follow-up rather than bolting
  them on without more room to think through what distinguishes "Enjoy Later" from the library
  itself.
- **Gentle collection suggestions** ("you've saved 5 things about X, want a collection?") — no
  suggestion engine exists; would need one designed, not just wired up.
- **Trip Companion card** — confirmed brand new; the existing `CompanionModeContext` is a
  different concept ("you're physically at a park right now"), not trip planning/itinerary.
  Did not repurpose it or fabricate a card with no real trip data behind it.

## Migration notes
No persisted-data shape changes. The old `saved`/`queue`/`following`/`downloads` tab selection
was never persisted (component-local `useState`), so there's nothing to migrate away from.

## Manual test list
- [ ] Play a podcast episode partway, leave the app, return to For You — confirm it appears
      under Continue Your Adventure and tapping it resumes from the saved position.
- [ ] Save several items, confirm up to 6 appear under The Gazette Library preview, and "Open
      the Gazette Library" shows the complete list plus followed collections.
- [ ] Set some favorite parks/topics in My Magic, confirm Today's Picks appears with relevant
      clusters; clear favorites, confirm the section disappears entirely.
- [ ] New/empty account: confirm all three sections are absent (not showing empty placeholders)
      and the screen doesn't look broken with just the greeting visible.
- [ ] VoiceOver: confirm each section title is a real heading and swiping moves cleanly between
      sections.
- [ ] Confirm the global MiniPlayer still reaches the Player/queue from the For You tab now
      that the dedicated Queue tab is gone.
Blocked on macOS/device access per PHASE_00_RESULTS.md.

## Exit criteria (from this phase's own spec)
- [x] Root sections, maximum three primary headings — exactly three, each a real heading
- [x] Sections disappear when empty
- [x] Single Save action always adds to The Gazette Library, no collection prompt — already
      true at the data layer (`app.toggleSaved`), confirmed unchanged
- [ ] Library smart shelves (Enjoy Later/Continue Reading/Continue Watching/Continue
      Listening/Recently Added/Ready Offline) — **not done**, see above
- [ ] User collections (create/rename/reorder/pin/move/copy/delete) — **not done**, see above
- [ ] Gentle collection suggestions — **not done**, see above
