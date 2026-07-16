# Navigation Migration

## Root tabs
Keep only News, Explore, For You.

## Settings
Remove Settings from any bottom-tab structure. Add a reusable root-header gear button to all three tabs. Settings uses a modal or stack presentation with title `Your Gazette`.

## Current code observations
`RootNavigator.tsx` already defines separate tab stacks and a Settings stack. Migrate without deleting route types prematurely. Legacy screens such as Sources, Source Library, Analytics, and Advanced should become hidden developer routes or be removed after migration validation.

## Back behavior
- Two-finger scrub and escape dismiss modal/pushed views.
- Preserve root-tab scroll position.
- Preserve last News view and position independently.
- Preserve Explore destination and dashboard section when requested.
