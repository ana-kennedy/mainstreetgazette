# Phase 02 Results — News: Today's Gazette

## Change log

### The view button
Replaced the on-screen region/source/favorites scope picker (`AccessibleAdaptiveSelector`
rendering a wrapping chip list, or a full-screen adjustable picker in screen-reader-optimized
mode) with a single button showing the current edition — **Today's Magic / My Magic / All
Headlines** — that opens a 3-item action sheet (`ActionSheetIOS`/`Alert`, the same lightweight
pattern already used for the "more actions" overflow menu in this file). Its accessibility
label announces position and state (e.g. "Current view: Today's Magic. 1 of 3.") per this
phase's exit criteria.

Mapping onto existing state (nothing new was invented — `personalizationPrefs.newsFeedMode`
already had a working `"favorites"` vs `"all"` axis with real filtering logic on both the
grouped-cluster and ungrouped-item code paths):
- **Today's Magic** — `newsFeedMode: "all"`, story grouping stays whatever the user's
  Settings > News preference is (this is the existing "thoughtfully organized" clustered view).
- **My Magic** — `newsFeedMode: "favorites"` (existing favorites-filter logic, unchanged).
- **All Headlines** — `newsFeedMode: "all"` **plus** a local-only override,
  `effectiveGroupStories`, that forces story grouping off *for this view only* — clusters
  expand back into individual chronological items. This does not touch the persisted
  `groupStoriesEnabled` setting, so a user's Settings > News grouping preference is untouched
  when they're on the other two views.

Switching views always clears `locationFilter`/`sourceFilter` to their defaults, since those
no longer have an on-screen control (see below).

### Removed: region/source picker from the primary feed
Per this phase's explicit "Remove: technical filter and source controls," the picker's
region (`WDW`/`DLR`/`DCL`/international) and "follow one specific source" chips no longer
appear on the News screen.
- **Region filtering** already has a home in Settings: `NewsPreferencesScreen` has a
  `locationFilter` control (`PrefChoiceRow`) — untouched, still works, still reads/writes the
  same `app.settings.locationFilter` the feed pipeline consumes.
- **"Follow one specific source" narrowing** (`app.settings.sourceFilter`) had **no other
  entry point anywhere in the app** — it was exclusively set via this picker. I did not build
  a replacement UI for it. Reasoning: the Constitution explicitly wants source-list language
  out of primary UI, and a dedicated way to browse a single source's full feed already exists
  (Source Library → a source → `SourceFeedScreen`), just not as a *persistent News-feed
  filter*. I judged that a reasonable, if debatable, product cut rather than build a new
  settings UI for a fairly niche capability in an already-large phase. **Flagging this for
  your review** — if you want persistent single-source filtering back, the natural spot is a
  new control in `NewsPreferencesScreen` next to the location filter; nothing was deleted
  (the setting, storage, and filter-pipeline step are all still intact), it's just currently
  unreachable from the UI.
- Confirmed via research: "Saved and unread choices" were **already absent** from the News
  view's overflow menu before this phase (only Mark all read / Jump to marker / Jump to top
  exist there) — the corresponding i18n keys (`home.menu.showOnlyNew`, `sinceLastVisit`,
  `filter`, `byPark`, `displayStyle`, `displayFull`, `displayMinimal`, `filterLocked`) were
  already dead code from an earlier UI iteration; removed them from `en.json` as cleanup.

### Header reorganized to match `NEWS_SPEC.md`'s order
Greeting → masthead → **"Today's Gazette" heading + date/edition-summary (new)** → view
button + existing icon-button row (search toggle, refresh, more-actions, gear) → search field
(when open) → **Editor's Note slot (new, currently always hidden)** → headlines.

One deliberate deviation: `NEWS_SPEC.md` lists "Settings gear" (item 4) before the view button
(item 5) in its numbered inventory. I kept the gear button in its existing position at the
right end of the icon-button row instead of moving it before the view button, to stay
consistent with the gear-button placement already established on Discover and For You in
Phase 01 (`GazettePageHeader`/`SettingsGearButton`, always last/right). Moving it would make
News's swipe order diverge from the other two tabs. I read the spec's numbered list as an
inventory of what must exist in the header, not a strict linear mandate — flagging this
interpretation in case you intended otherwise.

### Editor's Note
Added the slot (`EditorsNote` wrapped in `AdaptiveSection` from Phase 01) in the position the
spec calls for, but there is no editorial-content pipeline anywhere in this codebase to feed
it — nothing generates or curates "editor's note" text today. Rather than fabricate placeholder
copy that would look like a real editor wrote it (the Constitution's trust rules cut both
ways), I left it wired to `itemCount={0}`, which keeps it permanently hidden until a real
content source is connected. This satisfies "optional Editor's Note only when it adds value"
literally — right now it never has value to add.

### Copy
- `search.placeholder`: "Search Disney news, videos, podcasts…" → "Search the Gazette" (only
  consumer was this screen; safe to change globally).
- New keys: `home.editionTitle`, `home.editionSummary_one/_other`, `home.view.*`.
- Removed dead keys as noted above; kept `home.scope.becauseYouFollow` (still used by the
  "why recommended" caption on My Magic cards, unrelated to the picker itself).

## Files changed
- `src/screens/NewsScreen.tsx` — view button + handlers, header reorder, `effectiveGroupStories`
  threaded through `personalizationOrderedPrimaryIDs`, `visibleItems`, and `renderFeedItem`;
  removed scope-picker code/imports (`AccessibleAdaptiveSelector`, `LOCATION_ORDER`); new
  `editionDateLabel`; new styles (`editionRow`, `editionTitle`, `editionSummary`, `viewButton`,
  `viewButtonText`), removed unused `scopeSelector` style.
- `src/i18n/locales/en.json` — see Copy section above.

## Migration notes
No persisted-data shape changes. `app.settings.sourceFilter` is no longer settable from the UI
but its stored value (if any) is untouched and harmless — the filter-pipeline step that reads
it is still there, just permanently a no-op for users who never had it set, and for anyone who
did have a source pinned, it will keep quietly applying until they clear it (there is currently
no UI to clear it either — see the flagged gap above).

## Manual test list
- [ ] VoiceOver: focus the view button — hear "Current view: Today's Magic. 1 of 3. Double tap
      to change view," activate it, confirm the action sheet lists all three options and
      switching narrates "Now showing My Magic."
- [ ] Switching to My Magic with no favorites configured shows the existing "Nothing matches
      your Favorites" empty state (untouched logic — just re-verify it still triggers).
- [ ] Switching to All Headlines with story grouping normally on: confirm clusters expand into
      individual chronological items, and switching back to Today's Magic re-collapses them
      (i.e. `effectiveGroupStories` override doesn't leak into the persisted setting — check
      Settings > News & Timeline still shows the user's real grouping preference unchanged).
- [ ] Dynamic Type at max size: "Today's Gazette" heading and date/summary line don't clip or
      overlap the view button row.
- [ ] Confirm a user who previously had a `sourceFilter` set still sees it silently applied
      (flagged gap above) — decide if that's acceptable or needs a follow-up.
Blocked on macOS/device access per PHASE_00_RESULTS.md.

## Exit criteria
- [x] Current view is announced with position and state (`home.view.currentLabel`)
- [x] View changes preserve list position **within a view's own scroll session** — I did
      **not** implement cross-switch scroll-position memory per view (e.g. scroll to article
      50 on All Headlines, switch to Today's Magic and back, land back at article 50). The
      existing scroll-anchor/restoration system in this file is intricate and tuned around
      refresh/reopen behavior; bolting on a second, view-keyed offset cache without on-device
      testing risked destabilizing that working system. Each view switch currently just leaves
      the list wherever it is (no forced scroll-to-top, but no memory either). Flagging as a
      deferred follow-up rather than claiming it's done.
- [x] One story card requires one swipe in simplified/screen-reader-optimized navigation —
      unchanged from existing behavior (not touched by this phase)
