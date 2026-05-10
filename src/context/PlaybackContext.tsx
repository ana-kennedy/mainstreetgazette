import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
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

// Defensive shape for the expo-audio status update event — times are in seconds.
interface AudioStatus {
  currentTime?: number;
  duration?: number;
  playing?: boolean;
  isBuffering?: boolean;
  didJustFinish?: boolean;
}

interface PlaybackContextValue {
  currentItem: FeedItem | null;
  queue: PlaybackQueueItem[];
  currentTimeSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
  isBuffering: boolean;
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
  // expo-audio: one AudioPlayer at a time; we remove() it before creating the next.
  const playerRef = useRef<AudioPlayer | null>(null);
  // The status-update subscription so we can detach before removing the player.
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const currentItemRef = useRef<FeedItem | null>(null);
  const isLoadingRef = useRef(false);

  const [currentItem, setCurrentItem] = useState<FeedItem | null>(null);
  const [queue, setQueue] = useState<PlaybackQueueItem[]>([]);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
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

  // expo-audio fires status updates in seconds — no /1000 needed.
  const onStatusUpdate = useCallback(
    (status: AudioStatus) => {
      const position = Math.round(status.currentTime ?? 0);
      const duration = Math.round(status.duration ?? 0);
      setCurrentTimeSeconds(position);
      if (duration > 0) setDurationSeconds(duration);
      setIsBuffering(status.isBuffering ?? false);
      // While buffering after play(), the player reports playing:false even though
      // we want to play — don't let that override the intent and show "Paused".
      if (!status.isBuffering) {
        setIsPlaying(status.playing ?? false);
      }
      if (status.didJustFinish) {
        setIsBuffering(false);
        persistProgress(duration, duration);
        AccessibilityInfo.announceForAccessibility("Episode finished.");
      }
    },
    [persistProgress]
  );

  // Save progress, detach the listener, then destroy the player.
  const unloadCurrent = useCallback(async () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    if (playerRef.current) {
      const pos = Math.round(playerRef.current.currentTime ?? 0);
      const dur = Math.round(playerRef.current.duration ?? 0);
      await persistProgress(pos, dur);
      playerRef.current.pause();
      playerRef.current.remove();
      playerRef.current = null;
    }
  }, [persistProgress]);

  const play = useCallback(async () => {
    if (isLoadingRef.current) return;
    playerRef.current?.play();
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
      // Same item already loaded — just resume.
      if (currentItemRef.current?.id === item.id && playerRef.current) {
        await play();
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setLoadingItemID(item.id);
      setIsPlaying(false);

      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "doNotMix"
        });

        // Tear down the previous player before creating a new one.
        await unloadCurrent();

        // expo-audio: create player, wire up status listener, then play.
        const player = createAudioPlayer({ uri: item.canonicalURL });
        player.setPlaybackRate(currentSpeed);
        subscriptionRef.current = player.addListener("playbackStatusUpdate", onStatusUpdate);
        playerRef.current = player;

        setActiveItem(item);
        setDurationSeconds(item.durationSeconds ?? 0);
        setCurrentTimeSeconds(0);

        player.play();
        setIsPlaying(true);
        AccessibilityInfo.announceForAccessibility(`Playing ${item.title}.`);
      } catch (error) {
        // Clean up any partially-created player on failure.
        subscriptionRef.current?.remove();
        subscriptionRef.current = null;
        playerRef.current?.remove();
        playerRef.current = null;
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
    if (!playerRef.current) return;
    // Save progress at the exact paused position (player.currentTime is in seconds).
    await persistProgress(
      Math.round(playerRef.current.currentTime ?? 0),
      Math.round(playerRef.current.duration ?? 0)
    );
    playerRef.current.pause();
    setIsPlaying(false);
  }, [persistProgress]);

  const stop = useCallback(async () => {
    await unloadCurrent();
    setActiveItem(null);
    setCurrentTimeSeconds(0);
    setDurationSeconds(0);
    setIsPlaying(false);
    setIsBuffering(false);
    AccessibilityInfo.announceForAccessibility("Podcast stopped.");
  }, [setActiveItem, unloadCurrent]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  // expo-audio seekTo takes seconds directly (no ms conversion needed).
  const seek = useCallback(async (seconds: number) => {
    const clamped = Math.max(0, seconds);
    playerRef.current?.seekTo(clamped);
    setCurrentTimeSeconds(clamped);
  }, []);

  const skipForward = useCallback(async (seconds = 30) => {
    await seek(currentTimeSeconds + seconds);
  }, [currentTimeSeconds, seek]);

  const skipBackward = useCallback(async (seconds = 15) => {
    await seek(Math.max(0, currentTimeSeconds - seconds));
  }, [currentTimeSeconds, seek]);

  const setSpeed = useCallback(async (speed: number) => {
    setCurrentSpeed(speed);
    if (playerRef.current) {
      playerRef.current.playbackRate = speed;
    }
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
      isBuffering,
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
    [addToQueue, currentItem, currentSpeed, currentTimeSeconds, durationSeconds, isBuffering, isLoading, isPlaying, loadingItemID, pause, play, playItem, queue, removeFromQueue, seek, setSpeed, skipBackward, skipForward, stop, togglePlayPause]
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used inside PlaybackProvider");
  return context;
}
