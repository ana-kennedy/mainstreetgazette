# Main Street Gazette — Complete Redesign Implementation Handoff

This package is the authoritative implementation brief for the three-tab Main Street Gazette redesign.

## Product identity
Main Street Gazette is not presented as an RSS reader. It should feel like a warmly prepared Disney newspaper and daily companion. RSS, APIs, parsing, caches, metadata, and source mechanics remain backstage.

## Primary navigation
Only three bottom tabs remain:
1. News
2. Explore
3. For You

Settings is opened by the familiar gear button in the upper-right corner of every root tab. The destination page title is **Your Gazette**.

## Recommended implementation order
Follow the numbered phase files in `03_IMPLEMENTATION_PHASES`. Do not implement later screens before the shared design, accessibility, storage, and content models are stable.

## Non-negotiable rules
- Preserve existing working functionality unless a phase explicitly replaces it.
- Run `npm run typecheck` after every phase.
- Do not expose technical terminology to users.
- Do not display empty or weak sections merely because the component exists.
- Decorative icons and artwork stay visible but hidden from VoiceOver.
- User-created collections and intentionally saved content are never automatically deleted.
- Live, estimated, historical, editorial, and third-party information must be labeled honestly.
- Use familiar iOS navigation and controls before adding themed wording.

## Project status found during audit
- Expo SDK 54, React Native 0.81.5, TypeScript.
- Current typecheck passes.
- Existing project already has News, Discover/Explore, For You, Settings, Story Detail, personalization, collections, background tasks, weather, park services, sound context, accessibility utilities, and onboarding foundations.
- Existing `SoundContext.tsx` references two missing files under `sounds/xxx/picker-change.wav` for `unsave` and `session`. These must be replaced or removed.
- Several current user-facing labels still expose technical concepts such as source library, cache, RSS, analytics, and advanced diagnostics. These should be moved to hidden developer tools or rewritten.

## First Codex instruction
Open and follow `10_CODEX_PROMPTS/MASTER_CODEX_PROMPT.md`, then execute one phase at a time.
