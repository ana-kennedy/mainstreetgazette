# Phase 00 Results — Baseline, Backup, and Feature Inventory

## Branch
`feature/gazette-experience-redesign`, created from `main` at commit `b0a061d8`
("Migrate from deprecated expo-background-fetch to expo-background-task").
The working tree already contained a large amount of uncommitted, in-progress
redesign work (new screens, services, `ios-native/`, `ios-widget/`,
`ios-intents/`, `plugins/`) — that work now lives on this branch instead of
sitting uncommitted on `main`. `main` itself is untouched, so it remains the
rollback path.

## Typecheck baseline
`npm run typecheck` → clean, no errors, at branch creation.

## Screenshots / VoiceOver walkthrough
Not captured. This environment (Windows, no iOS simulator/device) cannot run
the app or VoiceOver. **Manual follow-up needed**: capture screenshots and a
VoiceOver walkthrough of News, Discover, For You, Settings, Story Detail,
onboarding, player, and Parks screens on a Mac/device before Phase 02+ starts
replacing these surfaces, so there's a visual/audio reference to diff against.

## Navigation route inventory (`src/navigation/types.ts`, `RootNavigator.tsx`)
Root tabs already match the target shape: `News`, `Discover`, `ForYou`, and a
`Preferences` tab that is a real route but hidden from the tab bar
(`tabBarButton: () => null`), reached via a gear icon on each root screen
(`onOpenPreferences` prop → `navigation.getParent()?.navigate("Preferences", ...)`).
This is functionally the "gear button → Settings stack" pattern the redesign
calls for — `Discover` still needs renaming to `Explore` (Phase 04) and the
gear button copy needs standardizing (done in Phase 01).

Per-stack routes:
- **NewsStack**: NewsHome, FeedDetail, StoryDetail, EntityProfile, Player
- **DiscoverStack**: DiscoverHome, FeedDetail, StoryDetail, CollectionDetail, EntityProfile, ParksHome, EntityGraph, SourcesHome, SourceFeed, SourceManage, Player
- **ForYouStack**: ForYouHome, SavedDetail, FeedDetail, CollectionDetail, EntityProfile, SourceManage, Player
- **SettingsStack** (`Preferences` tab): SettingsHome, Personalization, Analytics, NewsPreferences, SourceMediaPreferences, NotificationPreferences, AccessibilityPreferences, AppearanceStorage, AdvancedAbout, SourceLibrary, SourceFeed, SourceManage, FeedDetail, SourcePlayer, UserGuide, WhatsNew, AccessibilityGuide

Kept-but-unused-at-root param lists (retained only for prop types of screens
still reachable via Settings/Sources): `SavedStackParamList`,
`SourcesStackParamList`, `ParksStackParamList`.

## Screens becoming obsolete / hidden / renamed
Per `temp/11_PROJECT_AUDIT/CURRENT_PROJECT_MAPPING.md` and
`temp/05_TECHNICAL_ARCHITECTURE/NAVIGATION_MIGRATION.md`:

| Screen | Disposition |
|---|---|
| `SourceLibraryScreen`, `SourceManageScreen`, `AnalyticsScreen`, `AdvancedAboutScreen` | Hide from normal users / move to developer-only route |
| `AppearanceStorageScreen` | Split across Reading Experience, Accessibility, Gazette Library |
| `NotificationPreferencesScreen` | Rebuild as Gazette Alerts (flag: `gazetteAlertsEnabled`) |
| `PersonalizationScreen` | Rebuild as My Magic (flag: `myMagicEnabled`) |
| `DiscoverTabScreen` / `DiscoverScreen` | Destination-led Explore rebuild (flag: `exploreRedesignEnabled`) |
| `StoryDetailScreen` | Evolve into Gazette Reader (flag: `gazetteReaderEnabled`) |
| `SavedScreen.tsx` | Already deleted in the working tree prior to this phase |

None of these have been deleted or hidden yet — per Phase 00 rules, legacy
screens stay until their replacement passes acceptance.

## Feature flags added (`src/services/featureFlags.ts`, group `"redesign"`)
`gazetteReaderEnabled`, `exploreRedesignEnabled`, `gazetteLibraryEnabled`,
`myMagicEnabled`, `gazetteAlertsEnabled`, `startupWizardEnabled`,
`livingLibraryEnabled` — one per major redesigned surface named in Phases
03–09, all defaulting to `false` so nothing changes for users until a phase
is explicitly turned on. (`featureFlags.ts` itself was previously unused
dead code — not wired into any screen yet.)

## Exit criteria
- [x] Typecheck passes
- [x] Rollback path exists (`main` untouched, work isolated on feature branch)
- [x] Route migration plan documented (table above)
- [ ] Screenshots / VoiceOver walkthrough — blocked on macOS/device access, flagged as manual follow-up
