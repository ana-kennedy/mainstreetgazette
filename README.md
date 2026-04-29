# Main Street Gazette

Main Street Gazette is a React Native / Expo app for following Disney-related news, videos, and podcasts in one accessible mobile feed. It pulls from a bundled catalog of RSS, YouTube, and podcast sources, lets users choose which sources are enabled, and stores feed data and preferences locally on the device.

The app is built with Expo SDK 54, React Native, TypeScript, React Navigation, React Native Paper, AsyncStorage, and `expo-av`.

## Features

- Unified feed for articles, YouTube videos, and podcast episodes.
- Source manager for enabling and disabling bundled third-party feeds.
- Search across feed items and source metadata.
- Feed filters for all items, articles, videos, and podcasts.
- Saved items list for articles, videos, and podcast episodes.
- Pull-to-refresh and manual feed refresh.
- Local feed cache so previously fetched items remain available between launches.
- Checkpoint support for marking which stories are new since a selected item.
- Podcast playback with a persistent mini player, play/pause controls, seeking, skip controls, speed changes, queue storage, and playback progress persistence.
- Dark mode and feed display preferences.
- Accessibility-focused labels, hints, roles, spacing options, metadata visibility options, and low-vision display settings.
- Local-first privacy model with no accounts, ads, analytics, tracking, or in-app purchases.

## App Structure

```text
PixieWireExpo/
  App.tsx                         App providers, theme, navigation, mini player
  app.json                        Expo app configuration
  index.js                        Expo entry point
  package.json                    Scripts and dependencies
  src/
    assets/data/sources.json      Bundled source catalog
    components/                   Shared UI components
    context/                      App state and playback state providers
    domain/                       TypeScript domain models and defaults
    navigation/                   Tab and stack navigation
    screens/                      News, detail, saved, sources, player, settings screens
    services/                     Feed refresh, source loading, and local persistence
    theme/                        React Native Paper theme setup
    utils/                        Formatting, search, grouping, and accessibility helpers
```

## Screens

### News

The main screen shows the combined feed. Users can search, filter by content type, refresh feeds, save items, set checkpoints, open articles and videos externally, and start podcast playback.

### Saved

Saved collects any feed item the user has marked for later. Items keep the same open, playback, and unsave behavior as the main feed.

### Sources

Sources lists the bundled feed catalog. Each source includes its type, trust label, category tags, optional description, and an enable/disable switch. Only enabled sources are fetched during refresh.

### Player

The player screen and mini player are powered by `expo-av`. Podcast progress is saved locally so playback can resume later.

### Settings

Settings include appearance, feed behavior, accessibility preferences, playback defaults, and privacy/legal notes.

## Data and Persistence

Main Street Gazette stores app data locally with AsyncStorage:

- Cached feed items
- Enabled and disabled source choices
- Saved item IDs
- User settings
- Feed checkpoint date
- Podcast queue
- Podcast playback progress

The app fetches enabled source feeds directly from their providers. On web, a public proxy fallback is used for feeds that are blocked by browser CORS rules.

## Feed Handling

Feed refresh is implemented in `src/services/feedEngine.ts`.

Supported source types:

- RSS articles
- YouTube channel feeds
- Podcast RSS feeds

The feed engine fetches enabled sources, parses XML with `fast-xml-parser`, normalizes each entry into a shared `FeedItem` model, deduplicates items, applies saved/checkpoint state, and sorts results by publish date.

## Accessibility

Accessibility is a major part of the app design. Feed rows and controls include descriptive labels, roles, hints, and state where useful. The settings screen also includes low-vision options such as enhanced spacing, bold metadata, and thumbnail hiding.

Centralized accessibility helpers live in:

```text
src/utils/accessibility.ts
```

## Privacy

Main Street Gazette is local-first. It does not include accounts, ads, analytics, tracking, or in-app purchases. Feed content is fetched from the enabled third-party sources, and app state is stored on the device.

Main Street Gazette is an independent feed reader and podcast player. It is not affiliated with, endorsed by, or sponsored by Disney or the listed publishers.

A minimal privacy policy for App Store submission is available at:

```text
docs/privacy-policy.md
```

If this repository is published with GitHub Pages, that file can be used as the public Privacy Policy URL.

For GitHub Pages, publish from the `docs` folder. The policy URL will usually look like:

```text
https://<github-username>.github.io/<repo-name>/privacy-policy/
```

## Network Security

The bundled source catalog uses HTTPS feed and homepage URLs. Feed fetching, generated YouTube URLs, feed artwork, thumbnails, and podcast playback are constrained to HTTPS URLs.

The iOS Expo config does not enable arbitrary HTTP loads.

## Requirements

- Node.js
- npm
- Expo Go for device testing, or an iOS/Android simulator

## Running Locally

Install dependencies:

```sh
npm install
```

Start the Expo development server:

```sh
npm start
```

Then choose one of the Expo options:

- Press `i` to open iOS Simulator.
- Press `a` to open Android Emulator.
- Scan the QR code with Expo Go on a physical device.
- Press `w` to run the web version.

## Available Scripts

```sh
npm start
npm run android
npm run ios
npm run web
npm run typecheck
```

## Type Checking

Run TypeScript validation with:

```sh
npm run typecheck
```

## Notes for This Workspace

This app is self-contained inside `PixieWireExpo`. The sibling project folders are not required by the Expo app at runtime.

If your shell does not have `npm` available, install Node.js normally or add your local Node binary to `PATH` before running the commands above.
