# Phase 00 — Baseline, Backup, and Feature Inventory

## Goal
Create a safe implementation branch and map current features before replacement.

## Tasks
- Create a new branch such as `feature/gazette-experience-redesign`.
- Record current screenshots and VoiceOver walkthroughs of News, Discover, For You, Settings, Story Detail, onboarding, player, collections, and park screens.
- Run and save results from `npm run typecheck`.
- Inventory navigation routes in `src/navigation/types.ts` and `RootNavigator.tsx`.
- Identify screens that become obsolete, hidden developer-only, or renamed.
- Add feature flags for each major redesigned surface.
- Do not delete legacy screens until the replacement passes acceptance tests.

## Exit criteria
- Typecheck passes.
- Rollback path exists.
- Route migration plan is documented.
