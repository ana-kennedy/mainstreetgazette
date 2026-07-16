# Phase 04 Results — Explore Disney and Park Dashboards

## Scope decision, up front
Research before writing code found `ParkDetailSheet` (the modal that's the closest thing to
this phase's "park dashboard") is ~1,050 lines with 11 independently-collapsible sections in
an order that doesn't match the spec's four named groups (Today at the Park / Plan Your Day /
Today's Gazette / A Little Park Magic), and most of its live data (weather, hours, wait times,
refurbishments) is real (Open-Meteo, themeparks.wiki), while several sections (entertainment,
dining, accessibility, trip planning, transportation/show guidance) are either keyword-derived
from news clusters or fully static hardcoded copy. Reorganizing all eleven sections into the
four spec-named groups, and wiring live-vs-derived-vs-static labeling onto every one of them,
is a large structural rewrite of a file I can't visually verify in this environment. I scoped
this phase to concrete, additive, low-risk wins instead of that full rewrite — see "Not done"
below for what's deferred and why.

## Change log

### Explore root (`DiscoverScreen.tsx`) — destination-led per spec
- Title copy: "Discover" → "Explore Disney"; tab bar label: "Discover" → "Explore"
  (`tabs.discover`). Route names/component names (`DiscoverScreen`, `DiscoverStackParamList`,
  route `"Discover"`) were **not** renamed — this is a copy-level rename only, per the
  reasoning in PHASE_02_RESULTS.md about not rippling a route-identifier change through the
  whole nav tree in a content/UI phase. Flagging again here since Phase 00 had noted the fuller
  rename as a Phase 04 task.
- Added the prompt line "Where would you like to go today?" under the title.
- Added a horizontal row of destination cards — the root structure's actual headline ask —
  above the existing shelves: **Walt Disney World**, **Disneyland Resort**, and
  **International Resorts** navigate into `ParksHome` (destinations view); **Disney Cruise
  Line** shows an honest "not available yet" alert instead of a dead-end or fabricated card,
  since no live cruise data source exists anywhere in this app (themeparks.wiki, the only API
  this app talks to for parks, doesn't cover cruise ships).
- **Omitted the "Disney entertainment" destination** the spec also lists. There's no dedicated
  entertainment-destination surface to send it to — that content already lives in the Media
  Hub shelf further down this same screen — and the spec itself hedges this one with "where
  supported." Building a placeholder card with nowhere real to go would be exactly the "empty
  promise" the Constitution's rule 4 prohibits.
- Removed the "Browse Sources" nav card. Confirmed via `temp/11_PROJECT_AUDIT/CURRENT_PROJECT_MAPPING.md`
  and the copy reference's own "Avoid" list that Source Library-style browsing is meant to be
  hidden from normal UI — this was the only remaining entry point to it from Explore.
- **Kept** the "Disney Parks & Weather" nav card alongside the new destination cards, rather
  than removing it as redundant. It's the only current entry point to `ParksScreen`'s "hub"
  view, which also hosts "Browse by Interest" (→ `EntityGraphScreen`) and "Trip Planning" — I
  couldn't confirm those have any other route in, so removing this card risked silently
  orphaning that navigation. Left as a documented judgment call rather than guessing.

### Real deep-linking, not just a relabeled generic link
Added an `initialResortId` param end-to-end (`ParksHome` route type in `navigation/types.ts`,
`DiscoverScreenCore`'s `onNavigateToParks` prop, and a new effect in `ParksScreen.tsx` that
resolves the resort in the existing `RESORT_GROUPS` data and calls the same `handleParkPress`
the destination-grid taps already use). So the Walt Disney World and Disneyland Resort cards
genuinely open that resort's first park dashboard directly, rather than all four cards landing
on the identical generic grid — which would have been a bit dishonest UI (visually distinct
cards that all do the same thing). "International Resorts" still opens the full destinations
grid, since it's inherently a multi-resort landing.

### Trust labels wired to real data (Constitution rule 11)
- `src/components/FreshnessLabel.tsx` — built in Phase 01, never used anywhere until now.
  Its 7 `FreshnessKind` values are an exact match for this phase's trust-label list, and the
  `trust.*` i18n copy for them already existed. Wired it into two places:
  - **`WeatherContent`** (`src/components/WeatherModal.tsx`, shared by both `WeatherModal`
    and `ParkDetailSheet`'s Weather section — one fix, two surfaces): added `FreshnessLabel
    kind="live"` next to the existing "Updated {time}" text, plus a new **"About This
    Information"** action (an alert naming Open-Meteo as the independent data source and
    stating it isn't an official Disney source) — the first "About This Information" pattern
    outside `FeedDetailScreen` (Phase 03).
  - **Transportation** and **Shows & Fireworks** sections in `ParkDetailSheet` — both are
    fully static hardcoded guidance copy (`transportationGuidance()`/`showGuidance()`), not
    live data. Added `FreshnessLabel kind="planningGuide"` to both, which is the spec's exact
    instruction for this case: *"Otherwise show route guidance... clearly labeled as planning
    guidance."*

## Files changed
- `src/navigation/types.ts` — `ParksHome` param type gains `initialResortId?: string` (both
  `DiscoverStackParamList` and `ParksStackParamList`).
- `src/screens/ParksScreen.tsx` — new effect resolving `initialResortId` to a `handleParkPress`
  call; `FreshnessLabel` import + two usages; new `guidanceFreshnessRow` style.
- `src/screens/DiscoverScreen.tsx` — destination cards, prompt copy, `onNavigateToParks`
  signature widened to accept params, removed `onNavigateToSources` prop/NavCard, new styles.
- `src/screens/DiscoverTabScreen.tsx` — passes params through to `navigation.navigate`,
  removed `onNavigateToSources` wiring.
- `src/components/WeatherModal.tsx` — `FreshnessLabel` + "About This Information" on
  `WeatherContent`; new `updatedRow`/`aboutLink` styles.
- `src/i18n/locales/en.json` — `discover.title`, new `discover.prompt`, new
  `discover.destinations.*`, `tabs.discover` → "Explore"; removed dead `discover.sourcesTitle`/
  `sourcesSubtitle`.

## Not done (deferred, not silently skipped)
- **Reorganizing `ParkDetailSheet`'s 11 sections into the 4 named groups** (Today at the
  Park / Plan Your Day / Today's Gazette / A Little Park Magic) with real headings. This is
  the largest remaining piece of this phase's spec and needs its own pass with more room to
  verify against the actual modal rather than static reading.
- **Trust labels on Hours and Wait Times** — both are real live data with per-attraction
  `lastUpdated` timestamps, but surfacing them cleanly needs a closer look at exactly where
  that timestamp is available at render time; only Weather got the treatment this pass.
- **Virtual queues and a distinct "official notices" concept** — confirmed genuinely missing
  from the data layer (`parksService.ts` has no virtual-queue endpoint), not attempted.
- **Radio** — confirmed zero existing feature. I did not fabricate a list of "approved
  independent stations" — I have no way to verify real station names/URLs are appropriate,
  licensed, or what the spec means by "approved," and guessing here risked shipping broken or
  inappropriate external links. This needs a real station list from you before any UI gets
  built around it.
- **Full `Discover` → `Explore` identifier rename** — only user-visible copy was changed; the
  route name, screen/prop names, and file names are unchanged (see above).

## Manual test list
- [ ] Tap the Walt Disney World card — confirm it opens directly to Magic Kingdom's dashboard,
      not the destinations grid.
- [ ] Tap the Disneyland Resort card — confirm it opens directly to Disneyland's dashboard.
- [ ] Tap International Resorts — confirm the full destinations grid appears.
- [ ] Tap Disney Cruise Line — confirm the "not available yet" alert, not a crash or dead tap.
- [ ] VoiceOver: destination card row scrolls horizontally and each card announces title +
      subtitle + "double tap to explore."
- [ ] Open Weather (via a park dashboard or the standalone Weather modal) — confirm "Live",
      "Updated {time}", and "About This Information" all appear and the alert text is correct.
- [ ] Expand Transportation and Shows & Fireworks in a park dashboard — confirm "Planning
      guide" label appears above the guidance rows.
- [ ] Confirm "Browse Sources" is gone from Explore and nothing else on that screen is broken
      by its removal.
Blocked on macOS/device access per PHASE_00_RESULTS.md.

## Exit criteria (from this phase's own spec)
- [x] Destination cards for WDW, Disneyland Resort, DCL, international resorts — entertainment
      omitted with rationale above
- [x] No infinite mixed-content scrolling on the root — destination cards are a bounded
      horizontal row above the existing (already individually-gated) shelves
- [ ] Park dashboard groups (Today at the Park / Plan Your Day / Today's Gazette / A Little
      Park Magic) — **not done**, deferred per the scope decision above
- [x] Trust labels — wired for Weather (live) and Transportation/Shows guidance (planning
      guide); Hours/Wait Times/Refurbishments not yet covered
- [ ] Radio — **not done**, no real station data to build against
