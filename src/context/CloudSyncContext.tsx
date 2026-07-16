import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CLOUD_SYNC_KEYS,
  addCloudSyncChangeListener,
  cloudGetValue,
  cloudSetValue,
  isCloudSyncAvailable,
} from "../services/cloudSync";
import { useAppContext } from "./AppContext";

interface CloudSyncContextValue {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  triggerSync: () => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncContextValue | undefined>(undefined);

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const app = useAppContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const settings = app.settings;
  const syncEnabled = isCloudSyncAvailable && (settings?.iCloudSyncEnabled ?? false);

  const pushToCloud = useCallback(async () => {
    if (!syncEnabled || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const now = new Date().toISOString();
      const ops: Promise<void>[] = [];

      if (settings?.iCloudSyncSavedArticles) {
        ops.push(cloudSetValue(CLOUD_SYNC_KEYS.savedIDs, JSON.stringify(app.savedIDs)));
      }
      if (settings?.iCloudSyncSources) {
        const sourceStates = Object.fromEntries(app.sources.map((s) => [s.id, s.isEnabled]));
        ops.push(cloudSetValue(CLOUD_SYNC_KEYS.sourceStates, JSON.stringify(sourceStates)));
      }
      if (settings?.iCloudSyncSettings && settings) {
        ops.push(cloudSetValue(CLOUD_SYNC_KEYS.settings, JSON.stringify(settings)));
      }
      ops.push(cloudSetValue(CLOUD_SYNC_KEYS.lastSyncAt, now));

      await Promise.all(ops);
      setLastSyncedAt(new Date(now));
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [syncEnabled, settings, app.savedIDs, app.sources]);

  const pullFromCloud = useCallback(async () => {
    if (!syncEnabled) return;
    try {
      if (settings?.iCloudSyncSavedArticles) {
        const raw = await cloudGetValue(CLOUD_SYNC_KEYS.savedIDs);
        if (raw) {
          const cloudSavedIDs: string[] = JSON.parse(raw);
          // Merge: keep any locally saved that cloud doesn't know about, add cloud-only saves
          const merged = Array.from(new Set([...app.savedIDs, ...cloudSavedIDs]));
          if (merged.length !== app.savedIDs.length) {
            for (const id of cloudSavedIDs) {
              if (!app.savedIDs.includes(id)) {
                await app.toggleSaved(id);
              }
            }
          }
        }
      }
    } catch {
      // Pull errors are silent — local state takes precedence
    }
  }, [syncEnabled, settings, app.savedIDs, app.toggleSaved]);

  const triggerSync = useCallback(async () => {
    await pullFromCloud();
    await pushToCloud();
  }, [pullFromCloud, pushToCloud]);

  // Push whenever saved articles change
  const prevSavedIDsRef = useRef(app.savedIDs);
  useEffect(() => {
    if (!syncEnabled || !settings?.iCloudSyncSavedArticles) return;
    if (app.savedIDs === prevSavedIDsRef.current) return;
    prevSavedIDsRef.current = app.savedIDs;
    cloudSetValue(CLOUD_SYNC_KEYS.savedIDs, JSON.stringify(app.savedIDs)).catch(() => {});
  }, [syncEnabled, settings?.iCloudSyncSavedArticles, app.savedIDs]);

  // Push when source states change
  const prevSourcesRef = useRef(app.sources);
  useEffect(() => {
    if (!syncEnabled || !settings?.iCloudSyncSources) return;
    if (app.sources === prevSourcesRef.current) return;
    prevSourcesRef.current = app.sources;
    const sourceStates = Object.fromEntries(app.sources.map((s) => [s.id, s.isEnabled]));
    cloudSetValue(CLOUD_SYNC_KEYS.sourceStates, JSON.stringify(sourceStates)).catch(() => {});
  }, [syncEnabled, settings?.iCloudSyncSources, app.sources]);

  // Listen for external changes from other devices
  useEffect(() => {
    if (!syncEnabled) return;
    const sub = addCloudSyncChangeListener((keys) => {
      if (keys.includes(CLOUD_SYNC_KEYS.savedIDs) && settings?.iCloudSyncSavedArticles) {
        pullFromCloud().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [syncEnabled, settings?.iCloudSyncSavedArticles, pullFromCloud]);

  // Initial pull on launch when sync is enabled
  useEffect(() => {
    if (!syncEnabled || app.isLoading) return;
    pullFromCloud().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled, app.isLoading]);

  const value = useMemo(
    () => ({ isSyncing, lastSyncedAt, syncError, triggerSync }),
    [isSyncing, lastSyncedAt, syncError, triggerSync]
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncContextValue {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) throw new Error("useCloudSync must be used inside CloudSyncProvider");
  return ctx;
}
