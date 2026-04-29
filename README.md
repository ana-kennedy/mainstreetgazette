# Main Street Gazette Expo

React Native / Expo port of the Main Street Gazette app.

## What Was Ported

- `src/assets/data/sources.json` contains the bundled source catalog.
- Feed refresh logic uses `fetch` plus `fast-xml-parser` for RSS articles, YouTube channel feeds, and podcast RSS feeds.
- Swift domain models are represented as TypeScript interfaces in `src/domain/models.ts`.
- Saved articles, source enablement, settings, queue, cached feed, checkpoint, and playback progress use AsyncStorage.
- Podcast playback uses `expo-av`.
- Navigation uses React Navigation bottom tabs: News, Saved, Sources, Settings.
- Accessibility labels and hints are centralized in `src/utils/accessibility.ts` and applied to feed rows, buttons, source switches, tabs, and playback controls.

## Running

From this folder:

```sh
npm install
npm start
```

If you are running from the same Flatpak shell Codex used, prepend the local Node binary:

```sh
PATH="/home/anakennedy/Coding/MainStreetGazette/Main Street Gazette Project/.tools/node-v22.15.0-linux-x64/bin:$PATH" npm install
PATH="/home/anakennedy/Coding/MainStreetGazette/Main Street Gazette Project/.tools/node-v22.15.0-linux-x64/bin:$PATH" npm start
```

## Accessibility Notes

The app intentionally favors simple, explicit controls over visual density. Feed rows announce content type, title, source, publish time, duration, saved state, new state, and downloaded state. Interactive controls include `accessibilityLabel`, `accessibilityHint` where useful, and `accessibilityRole`.
