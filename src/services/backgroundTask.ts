import * as BackgroundTask from "expo-background-task";
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

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundFetch(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (isRegistered) return;

  await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15, // minutes; iOS/Android decide actual timing
  });
}
