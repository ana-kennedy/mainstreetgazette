# Phase 06 Results — Living Gazette Library and Adaptive Backfill

## Scope decision, up front
Research before writing code found this phase was completely greenfield: no storage-tier
concept, no adaptive/resumable backfill, and no OS-condition gating existed anywhere in
`storage.ts`, `backgroundTask.ts`, or `feedEngine.ts` (only one unused feature flag,
`livingLibraryEnabled`, anticipated the phase). Two structural constraints shaped what was
actually buildable, both confirmed during implementation, not assumed up front:

- **Standard RSS/Atom/podcast feeds don't support paging into history before their own
  current window.** There is no protocol-level "give me older items" request to make.
  So "backfill" here is implemented honestly as *raising how deep into each source's
  already-available feed window we ingest*, adaptively, across background runs — not a
  fabricated "fetch pre-existing history" mechanism the underlying feeds can't actually
  serve.
- **True OS thermal-state has no reliable cross-platform JS API** without a custom native
  module. This is approximated with a consecutive-slow-or-failed-background-run counter
  (`deviceConditions.ts`) — a deliberate, documented reduced-scope decision, not a silent
  skip.

Everything else in the spec (storage tiers, resumable per-source cursors, Low Power
Mode/cellular/poor-connection gating, adaptive section diversity thresholds, the required
user-facing string) is implemented for real, not scaffolded.

## Change log

### Storage tiers (`src/domain/models.ts`, `src/services/storage.ts`)
Added `FeedItem.contentTier?: "fresh" | "remembered" | "archived"` and a new
`applyStorageTiers()` in `storage.ts` that replaces the old binary keep/delete logic:

- **User-owned** (`isSaved`): always kept in full, tier forced to `"fresh"` — unchanged
  behavior, still enforced in one place instead of two.
- **Fresh** (age ≤ `retentionWindowDays`, repurposed from a previously dead setting,
  default 14 days): kept in full.
- **Remembered** (`retentionWindowDays` < age ≤ `cacheWindowDays`, default 90 days):
  `thumbnailURL`/`artworkURL` dropped; summary, tags, entity/topic matches, and the
  original URL are kept (per the spec's explicit "metadata, summary, tags, relationships,
  original URL" wording for this tier).
- **Archived** (`cacheWindowDays` < age ≤ `cacheWindowDays × 4`): trimmed to a genuine
  minimum searchable record — `id`/`title`/`canonicalURL`/`sourceID`/`sourceType`/
  `contentType`/`publishedAt`/`tags` only.
- Older than the archive ceiling and never saved: dropped entirely, same as before.

A new `optimizeStorageAutomatically` setting (default `true`) is the "Optimize
Automatically" vs "Keep Everything Available" switch the spec calls for at the storage
tier level — when `false`, `applyStorageTiers` is a no-op. (The UI toggle for this ships
in Phase 07's Gazette Library group; the mechanism is real now.)

`AppContext.tsx`'s `enforceCacheWindow()` now delegates to `applyStorageTiers` instead of
its old hard age-cutoff filter, and is called with the full settings object instead of
just `cacheWindowDays` at all three call sites (initial hydrate, post-refresh, and
`updateSettings` when any of the three tiering-relevant settings change).
`backgroundTask.ts`'s call site was updated the same way.

### Adaptive per-source backfill batching (`src/services/feedEngine.ts`)
- `MAX_ITEMS_PER_SOURCE` stays as the baseline cap for interactive/manual refresh
  (unchanged — pulling to refresh never gets throttled).
- New `effectiveItemCap(source, meta, allowBackfill)`: when backfill is allowed, raises
  the cap from `SourceMeta.backfillCursorCount` (or the baseline, on a source's first
  run) by 50 per background run, up to a 500 ceiling — the spec's target bands.
- `recentItemsForSource`/`parseFeedItems`/`fetchSource` now take an explicit `itemCap`
  parameter instead of hardcoding `MAX_ITEMS_PER_SOURCE` internally.
- `refreshFeeds()` gained an optional 7th parameter, `options?: { allowBackfill?: boolean }`
  (default `false`, so every existing call site — the interactive refresh in
  `AppContext.tsx` — is unaffected without any code change there). When `true`,
  `SourceMeta.backfillCursorCount`/`lastBackfillBatchAt` are updated per source after a
  successful fetch.
- New `isBackfillInProgress(sources, sourceMeta)`: true while any enabled source's
  `backfillCursorCount` is still below its target band (200 for sources enabled by
  default — a proxy for "essential" — 100 for the rest). Used only to decide whether to
  show the quiet growth message below, never a raw count.
- The YouTube HTML scraping fallback path (`parseYouTubeHTMLFallback`, used only when a
  channel's RSS feed blocks the request) still uses the flat `MAX_ITEMS_PER_SOURCE`
  baseline rather than the adaptive cap — it's a rare error-path fallback, and extending
  adaptive backfill into a scraping path added risk for a phase that's already touching
  the primary ingestion path everywhere else.

### Device/network condition gating (new `src/services/deviceConditions.ts`)
Added the `expo-battery` dependency (Expo-Go compatible, no prebuild needed).
`evaluateBackfillConditions(settings)` returns `{ allowBackfill, reason? }`, checking in
order: Low Power Mode (`expo-battery`'s `isLowPowerModeEnabledAsync`) → consecutive-slow-
run thermal proxy → connection quality (existing `useNetworkState.ts`'s
`isSlowConnection`) → the new `growLibraryWifiOnly` setting (default `true`) against
connection type. `backgroundTask.ts` calls this before every run and passes the result
into `refreshFeeds`'s new `allowBackfill` option; the baseline "fetch latest per source"
work is never gated by any of this, only the extra backfill batch is. Storage-pressure
gating uses an item-count proxy already implicit in the tier ceilings above rather than a
real OS disk-space check (see "Not done" below).

### Adaptive section diversity thresholds (`src/components/AdaptiveSection.tsx`)
Added optional `sourceIDs`/`minUniqueSources` props, backward-compatible with every
existing `itemCount`/`minItems`-only caller. Applied it to For You's "Today's Picks"
section (`ForYouScreen.tsx`), which now also requires ≥2 distinct sources across its
displayed clusters — a recommendation shelf backed by five items from one source isn't
"meaningful variety," per the explicit warning in
`temp/05_TECHNICAL_ARCHITECTURE/CONTENT_AND_STORAGE_MODEL.md` against raw-count-only
gates. "Continue Your Adventure" and "The Gazette Library" preview sections were left on
the original count-only check — they're inherently single-source-per-item lists (a
resumed podcast, a saved item), where source diversity isn't a meaningful signal.

### User communication
Added `library.growing`: "Your Gazette Library continues to grow as you explore." to
`en.json`, surfaced as a quiet `ListFooterComponent` note in `GazetteLibraryScreen.tsx`,
shown only while `isBackfillInProgress` is true — never a queue, count, or technical
detail.

## Files changed
- `src/domain/models.ts` — `ContentTier` type, `FeedItem.contentTier`, `SourceMeta`
  backfill fields, `UserSettings.optimizeStorageAutomatically`/`growLibraryWifiOnly` +
  defaults.
- `src/services/storage.ts` — new `applyStorageTiers()`.
- `src/services/feedEngine.ts` — `effectiveItemCap()`, `isBackfillInProgress()`,
  `refreshFeeds()` gains `options.allowBackfill`, cap threaded through
  `recentItemsForSource`/`parseFeedItems`/`fetchSource`.
- `src/services/deviceConditions.ts` — new.
- `src/services/backgroundTask.ts` — evaluates conditions, passes `allowBackfill`,
  records run outcome for the thermal-backoff proxy.
- `src/context/AppContext.tsx` — `enforceCacheWindow()` delegates to `applyStorageTiers`;
  `updateSettings` reapplies tiers when any tiering-relevant setting changes.
- `src/components/AdaptiveSection.tsx` — optional diversity-gating props.
- `src/screens/ForYouScreen.tsx` — Today's Picks uses the new diversity gate.
- `src/screens/GazetteLibraryScreen.tsx` — growth-message footer.
- `src/i18n/locales/en.json` — `library.growing`.
- `package.json` / `package-lock.json` — `expo-battery` dependency.

## Not done (deferred, not silently skipped)
- **Real OS thermal-state detection** — no reliable cross-platform JS API exists;
  approximated with a consecutive-slow-run counter instead (see Scope decision above).
- **Real device free-disk-space check** — would need the `expo-file-system` dependency;
  used the existing tier ceilings (item age/count) as a soft proxy instead of a true OS
  disk-space read. Flag if you'd rather add that dependency for a real check.
- **Podcast/YouTube "fast metadata pass now, media fetch later" split** — thumbnails and
  artwork are still fetched eagerly for every item, every run, in
  `normalizePodcast`/`normalizeYouTube`. This is a genuine spec gap ("no thumbnails/media
  during broad backfill unless justified") but re-plumbing enrichment timing for those two
  content types is a separate, contained change I'd rather do as a fast follow now that
  tiering is in place and provable, rather than risk both in the same pass.
- **Social platform backfill** — no social ingestion exists in `feedEngine.ts` at all
  (only `rssArticle`/`youtubeChannel`/`podcastRSS`/`redditFeed`); out of scope until a
  social source type exists.
- **YouTube HTML-fallback scraping path** doesn't participate in adaptive backfill (see
  Change log above) — it's a rare fallback, not the primary ingestion path.

## Migration notes
- `FeedItem.contentTier` is optional; every function that reads it treats `undefined` as
  `"fresh"`, so previously-cached items (from before this phase) behave exactly as they
  did before until they next age past the fresh window and get tagged on the next tiering
  pass.
- `SourceMeta.backfillCursorCount`/`lastBackfillBatchAt` are optional and absent for every
  existing source until its first background run under the new code — `effectiveItemCap`
  falls back to the existing flat baseline in that case, so there's no discontinuity.
- `UserSettings.optimizeStorageAutomatically`/`growLibraryWifiOnly` get their defaults
  (`true`/`true`) via the existing `{ ...defaultUserSettings, ...stored }` merge in
  `loadSettings()` — no explicit migration code needed, consistent with how every other
  settings field in this file has been added historically.
- The previously-dead `retentionWindowDays` setting now has real behavior (fresh/remembered
  boundary) for the first time. Anyone who'd already set a custom value for it (the setting
  existed and was user-adjustable in `AppearanceStorageScreen` before this phase, just
  unread by any code) will see that value take effect immediately rather than starting
  from the default — this is a behavior change worth watching for after this phase ships,
  though it only affects when older unsaved items lose their images, never save status.

## Manual test list
- [ ] Save an item, then use developer tools (or manipulate the cached feed) to age an
      unsaved item past `retentionWindowDays` — confirm its thumbnail/artwork disappear
      but title/summary/tags remain, and it still counts as present in the Library.
- [ ] Age an unsaved item past `cacheWindowDays` — confirm it's now a minimal record
      (title/URL/date only, no summary) rather than gone.
- [ ] Age an item past `cacheWindowDays × 4` — confirm it's removed from the cache
      entirely (and that a saved copy of the same-aged item is never removed).
- [ ] Toggle a "Keep Everything Available"-equivalent (`optimizeStorageAutomatically:
      false` via developer tools until Phase 07 ships the UI) and confirm no items shrink
      or disappear regardless of age.
- [ ] With `growLibraryWifiOnly` on and the device on cellular, confirm a background run
      still updates the News feed (baseline refresh) but doesn't raise
      `backfillCursorCount` for any source.
- [ ] Enable Low Power Mode and confirm the same: News still refreshes, backfill doesn't
      advance.
- [ ] Over several consecutive background runs on Wi-Fi with Low Power Mode off, confirm
      `backfillCursorCount` climbs by ~50 per run per source (inspectable via developer
      tools/AsyncStorage) up to the 500 ceiling.
- [ ] On For You, confirm "Today's Picks" only appears when its clusters span ≥2 distinct
      sources; with favorites narrowed to a single-source topic, confirm it's hidden
      rather than showing a single-source shelf.
- [ ] In the Gazette Library, confirm the "Your Gazette Library continues to grow as you
      explore." note appears only while backfill targets haven't been reached, and
      disappears once every enabled source clears its target band.
Blocked on macOS/device access per `PHASE_00_RESULTS.md` — I ran `npm run typecheck`
(passes cleanly) and read through every changed code path; on-device Low Power Mode/
cellular/VoiceOver checks are for you.

## Exit criteria (from this phase's own spec)
- [x] Storage tiers (User-owned/Fresh/Remembered/Archived) — implemented
- [x] Backfill: adaptive batching with resumable per-source cursor — implemented (within
      the real constraint that standard feeds can't be paged into history, see Scope
      decision)
- [x] Conditions: pause/reduce for Low Power Mode, cellular preference, poor connection —
      implemented
- [~] Conditions: storage/thermal — approximated (item-count proxy / consecutive-slow-run
      proxy), not a real OS-level read; documented above
- [x] Adaptive feature thresholds beyond raw count — implemented for one section
      (Today's Picks); other adaptive sections didn't have a meaningful diversity signal
      to check
- [x] User communication string — implemented, gated correctly
- [ ] Podcast/YouTube deferred-media-fetch split — **not done**, see above
