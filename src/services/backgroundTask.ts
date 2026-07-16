import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { enforceCacheWindow } from "../context/AppContext";
import { refreshFeeds } from "./feedEngine";
import {
  addNotifiedClusterIDs,
  loadCachedFeed,
  loadCheckpointDate,
  loadNotifiedClusterIDs,
  loadSettings,
  loadSourceMeta,
  loadSources,
  loadSavedIDs,
  saveCachedFeed,
  saveSourceMeta,
} from "./storage";
import { adaptFeedItemsToContentItems } from "./contentItemAdapter";
import { clusterContentItems } from "./storyClusterService";
import { loadPersonalizationPreferences } from "../personalization/preferenceStorage";
import { evaluateNotifications } from "../intelligence/phase9";
import { evaluateBackfillConditions, recordBackgroundRunOutcome } from "./deviceConditions";
import { sendImmediateNotification } from "./pushNotifications";

const BACKGROUND_FETCH_TASK = "mainstreetgazette-background-fetch";
// A run slower than this counts toward the consecutive-slow-run thermal-backoff proxy
// in deviceConditions.ts (see that file for why a real thermal-state API isn't used).
const SOURCE_REFRESH_SLOW_THRESHOLD_MS = 20_000;

// Must be defined at module scope (top-level) — TaskManager requires this.
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const startedAt = Date.now();
  try {
    const [sources, savedIDs, sourceMeta, settings, cachedFeed, checkpointDate] = await Promise.all([
      loadSources(),
      loadSavedIDs(),
      loadSourceMeta(),
      loadSettings(),
      loadCachedFeed(),
      loadCheckpointDate(),
    ]);

    // The baseline "fetch latest per source" refresh always runs, unconditionally, so
    // News keeps updating regardless of device state. Only the *extra* adaptive
    // backfill batch (raising how deep into each source's feed we ingest) is gated on
    // Low Power Mode / cellular preference / a poor connection / sustained slow runs.
    const conditions = settings
      ? await evaluateBackfillConditions(settings)
      : { allowBackfill: false as const };

    const result = await refreshFeeds(sources, savedIDs, sourceMeta, cachedFeed, checkpointDate, undefined, {
      allowBackfill: conditions.allowBackfill,
    });
    let freshItems = result.items;
    if (settings) {
      freshItems = enforceCacheWindow(freshItems, settings);
    }
    await Promise.all([saveCachedFeed(freshItems), saveSourceMeta(result.updatedSourceMeta)]);

    recordBackgroundRunOutcome(Date.now() - startedAt > SOURCE_REFRESH_SLOW_THRESHOLD_MS || result.failures.length > 0);

    // Phase 9: evaluate which clusters warrant notifications after this refresh.
    // Phase 08: actually deliver them via expo-notifications (local, on-device —
    // scheduleNotificationAsync with trigger: null fires immediately). Skipped
    // entirely if permission was never granted (see pushNotifications.ts — permission
    // is only ever requested from a user's explicit Gazette Alerts toggle, never here).
    if (settings) {
      try {
        const [prefs, notifiedClusterIDs] = await Promise.all([
          loadPersonalizationPreferences(),
          loadNotifiedClusterIDs(),
        ]);
        const contentItems = adaptFeedItemsToContentItems(freshItems, sources);
        const clusters = clusterContentItems(contentItems);
        const batch = evaluateNotifications({
          clusters,
          prefs,
          settings,
          seenClusterIDs: new Set(notifiedClusterIDs),
        });

        for (const payload of batch.immediate) {
          await sendImmediateNotification(payload.title, payload.body);
        }
        if (batch.digest) {
          await sendImmediateNotification(batch.digest.title, batch.digest.body);
        }

        const newlyNotifiedIDs = batch.immediate
          .map((p) => p.clusterId)
          .filter((id): id is string => Boolean(id));
        await addNotifiedClusterIDs(newlyNotifiedIDs);
      } catch {
        // Notification evaluation/delivery is non-critical; do not fail the background task
      }
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    recordBackgroundRunOutcome(true);
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
