import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import type { FeedItem, PlaybackQueueItem } from "../domain/models";
import { loadQueue, savePlaybackProgress, saveQueue } from "../services/storage";

function isHTTPSURL(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

interface PlaybackContextValue {
  currentItem: FeedItem | null;
  queue: PlaybackQueueItem[];
  currentTimeSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
  isLoading: boolean;
  loadingItemID: string | null;
  currentSpeed: number;
  playItem: (item: FeedItem) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBackward: (seconds?: number) => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  addToQueue: (item: FeedItem) => Promise<void>;
  removeFromQueue: (feedItemID: string) => Promise<void>;
}

const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentItemRef = useRef<FeedItem | null>(null);
  const isLoadingRef = useRef(false);
  const [currentItem, setCurrentItem] = useState<FeedItem | null>(null);
  const [queue, setQueue] = useState<PlaybackQueueItem[]>([]);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingItemID, setLoadingItemID] = useState<string | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(1);

  const setActiveItem = useCallback((item: FeedItem | null) => {
    currentItemRef.current = item;
    setCurrentItem(item);
  }, []);

  const persistProgress = useCallback(async (positionSeconds: number, duration: number) => {
    const activeItem = currentItemRef.current;
    if (!activeItem) return;
    await savePlaybackProgress({
      feedItemID: activeItem.id,
      positionSeconds,
      durationSeconds: duration,
      lastPlayedAt: new Date().toISOString(),
      isCompleted: duration > 0 ? positionSeconds >= Math.max(1, duration - 3) : false
    });
  }, []);

  const onStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      const position = Math.round((status.positionMillis ?? 0) / 1000);
      const duration = Math.round((status.durationMillis ?? 0) / 1000);
      setCurrentTimeSeconds(position);
      if (duration > 0) setDurationSeconds(duration);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        persistProgress(duration, duration);
        AccessibilityInfo.announceForAccessibility("Episode finished.");
      }
    },
    [persistProgress]
  );

  const unloadCurrent = useCallback(async () => {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await persistProgress(Math.round(status.positionMillis / 1000), Math.round((status.durationMillis ?? 0) / 1000));
      }
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, [persistProgress]);

  const play = useCallback(async () => {
    if (isLoadingRef.current) return;
    await soundRef.current?.playAsync();
    setIsPlaying(true);
  }, []);

  const playItem = useCallback(
    async (item: FeedItem) => {
      if (item.contentType !== "podcast") return;
      if (!isHTTPSURL(item.canonicalURL)) {
        AccessibilityInfo.announceForAccessibility("Podcast playback requires an HTTPS audio URL.");
        return;
      }
      if (isLoadingRef.current) return;
      if (currentItemRef.current?.id === item.id && soundRef.current) {
        await play();
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setLoadingItemID(item.id);
      setIsPlaying(false);
      let nextSound: Audio.Sound | null = null;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false
        });
        await unloadCurrent();
        nextSound = new Audio.Sound();
        soundRef.current = nextSound;
        setActiveItem(item);
        setDurationSeconds(item.durationSeconds ?? 0);
        setCurrentTimeSeconds(0);
        nextSound.setOnPlaybackStatusUpdate(onStatusUpdate);
        await nextSound.loadAsync(
          { uri: item.canonicalURL },
          { shouldPlay: true, rate: currentSpeed, shouldCorrectPitch: true, progressUpdateIntervalMillis: 1000 },
          false
        );
        setIsPlaying(true);
        AccessibilityInfo.announceForAccessibility(`Playing ${item.title}.`);
      } catch (error) {
        if (nextSound) {
          await nextSound.unloadAsync().catch(() => undefined);
        }
        soundRef.current = null;
        setActiveItem(null);
        setDurationSeconds(0);
        setCurrentTimeSeconds(0);
        setIsPlaying(false);
        const message = error instanceof Error ? error.message : "Unable to play this podcast.";
        AccessibilityInfo.announceForAccessibility(`Podcast failed to play. ${message}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
        setLoadingItemID(null);
      }
    },
    [currentSpeed, onStatusUpdate, play, setActiveItem, unloadCurrent]
  );

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded) {
      await persistProgress(Math.round(status.positionMillis / 1000), Math.round((status.durationMillis ?? 0) / 1000));
    }
    await soundRef.current.pauseAsync();
    setIsPlaying(false);
  }, [persistProgress]);

  const stop = useCallback(async () => {
    await unloadCurrent();
    setActiveItem(null);
    setCurrentTimeSeconds(0);
    setDurationSeconds(0);
    setIsPlaying(false);
    AccessibilityInfo.announceForAccessibility("Podcast stopped.");
  }, [setActiveItem, unloadCurrent]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback(async (seconds: number) => {
    await soundRef.current?.setPositionAsync(Math.max(0, seconds) * 1000);
    setCurrentTimeSeconds(Math.max(0, seconds));
  }, []);

  const skipForward = useCallback(async (seconds = 30) => {
    await seek(currentTimeSeconds + seconds);
  }, [currentTimeSeconds, seek]);

  const skipBackward = useCallback(async (seconds = 15) => {
    await seek(Math.max(0, currentTimeSeconds - seconds));
  }, [currentTimeSeconds, seek]);

  const setSpeed = useCallback(async (speed: number) => {
    setCurrentSpeed(speed);
    await soundRef.current?.setRateAsync(speed, true);
    AccessibilityInfo.announceForAccessibility(`Playback speed ${speed} times.`);
  }, []);

  const addToQueue = useCallback(async (item: FeedItem) => {
    const existing = await loadQueue();
    if (existing.some((queueItem) => queueItem.feedItemID === item.id)) {
      AccessibilityInfo.announceForAccessibility("Episode is already in the queue.");
      setQueue(existing);
      return;
    }
    const next = [
      ...existing,
      {
        id: `${item.id}-${Date.now()}`,
        feedItemID: item.id,
        sortIndex: existing.length,
        addedAt: new Date().toISOString()
      }
    ];
    setQueue(next);
    await saveQueue(next);
    AccessibilityInfo.announceForAccessibility("Episode added to queue.");
  }, []);

  const removeFromQueue = useCallback(async (feedItemID: string) => {
    const next = (await loadQueue())
      .filter((item) => item.feedItemID !== feedItemID)
      .map((item, index) => ({ ...item, sortIndex: index }));
    setQueue(next);
    await saveQueue(next);
    AccessibilityInfo.announceForAccessibility("Episode removed from queue.");
  }, []);

  const value = useMemo(
    () => ({
      currentItem,
      queue,
      currentTimeSeconds,
      durationSeconds,
      isPlaying,
      isLoading,
      loadingItemID,
      currentSpeed,
      playItem,
      play,
      pause,
      stop,
      togglePlayPause,
      seek,
      skipForward,
      skipBackward,
      setSpeed,
      addToQueue,
      removeFromQueue
    }),
    [addToQueue, currentItem, currentSpeed, currentTimeSeconds, durationSeconds, isLoading, isPlaying, loadingItemID, pause, play, playItem, queue, removeFromQueue, seek, setSpeed, skipBackward, skipForward, stop, togglePlayPause]
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used inside PlaybackProvider");
  return context;
}
