import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { enforceCacheLimit } from "../context/AppContext";
import { refreshFeeds } from "./feedEngine";
import {
  loadCachedFeed,
  loadCheckpointDate,
  loadSettings,
  loadSourceMeta,
  loadSources,
  loadSavedIDs,
  saveCachedFeed,
  saveSourceMeta,
} from "./storage";

const BACKGROUND_FETCH_TASK = "mainstreetgazette-background-fetch";

// Must be defined at module scope (top-level) — TaskManager requires this.
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const [sources, savedIDs, sourceMeta, settings, cachedFeed, checkpointDate] = await Promise.all([
      loadSources(),
      loadSavedIDs(),
      loadSourceMeta(),
      loadSettings(),
      loadCachedFeed(),
      loadCheckpointDate(),
    ]);

    const result = await refreshFeeds(sources, savedIDs, sourceMeta, cachedFeed, checkpointDate);
    let freshItems = result.items;
    if (settings) {
      freshItems = enforceCacheLimit(freshItems, settings.cacheWindowDays, settings.maxCachedItems);
    }
    await Promise.all([saveCachedFeed(freshItems), saveSourceMeta(result.updatedSourceMeta)]);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetch(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return;
  }
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (isRegistered) return;
  await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15 * 60, // 15 min minimum; iOS/Android decide actual timing
    stopOnTerminate: false,   // keep running after app is closed
    startOnBoot: true,        // re-register after device reboot (Android)
  });
}
