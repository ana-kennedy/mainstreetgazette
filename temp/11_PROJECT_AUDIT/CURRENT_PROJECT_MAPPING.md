# Current Project Mapping

## Existing high-value foundations
- Navigation: `src/navigation/RootNavigator.tsx`, `types.ts`
- Root screens: `NewsTabScreen.tsx`, `DiscoverTabScreen.tsx`, `ForYouTabScreen.tsx`
- Story: `StoryDetailScreen.tsx`, `FeedDetailScreen.tsx`
- Cards: `FeedItemCard.tsx`, `StoryClusterCard.tsx`, `CollectionCard.tsx`
- Personalization: `PersonalizationContext.tsx`, `src/personalization/*`
- Collections: `useCollections.ts`, `CollectionScreen.tsx`, phase10 intelligence
- Accessibility: hooks, `utils/accessibility.ts`, `accessibilityAudit.ts`, guide/preferences screens
- Background work: `services/backgroundTask.ts`
- Storage: `services/storage.ts`
- Parks/weather: `parksService.ts`, `weatherService.ts`, `ParksScreen.tsx`, `WeatherModal.tsx`
- Sounds: `SoundContext.tsx`, `sounds/`
- Onboarding: `OnboardingScreen.tsx`, `FirstTimeTour.tsx`, tutorial/welcome services
- Search: `src/search/*`
- Classification/clustering: `services/classification/*`, story cluster services

## Likely migration targets
- `AccessibleAdaptiveSelector` and `LocationFilter`: replace picker-heavy News use; reuse only where semantically appropriate.
- `SourceLibraryScreen`, `SourceManageScreen`, `AnalyticsScreen`, `AdvancedAboutScreen`: hide from normal users or migrate into developer mode.
- `AppearanceStorageScreen`: split content across Reading Experience, Accessibility, and Gazette Library.
- `NotificationPreferencesScreen`: rename/rebuild as Gazette Alerts.
- `PersonalizationScreen`: rebuild as My Magic.
- `DiscoverTabScreen`: destination-led Explore redesign.
- `StoryDetailScreen`: evolve into Gazette Reader/unified content page.

## Current health
`npm run typecheck` passed before creating this handoff.
