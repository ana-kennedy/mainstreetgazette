import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import { useAppContext } from "./AppContext";

type SoundContextValue = {
  playConfirm: () => void;
  playSelect: () => void;
  playBack: () => void;
  playMagic: () => void;
  playSave: () => void;
  playUnsave: () => void;
  playError: () => void;
  playRefreshComplete: () => void;
  playRefreshStart: () => void;
  playOffline: () => void;
  playReconnect: () => void;
  playSearch: () => void;
  playSession: () => void;
  playPodcastPlay: () => void;
  playArticleOpen: () => void;
  playTip: () => void;
  playWelcome: () => void;
  playTabChange: () => void;
  playScreenClose: () => void;
  playPickerTick: () => void;
  playPodcastPause: () => void;
};

const SoundContext = createContext<SoundContextValue>({
  playConfirm: () => {},
  playSelect: () => {},
  playBack: () => {},
  playMagic: () => {},
  playSave: () => {},
  playUnsave: () => {},
  playError: () => {},
  playRefreshComplete: () => {},
  playRefreshStart: () => {},
  playOffline: () => {},
  playReconnect: () => {},
  playSearch: () => {},
  playSession: () => {},
  playPodcastPlay: () => {},
  playArticleOpen: () => {},
  playTip: () => {},
  playWelcome: () => {},
  playTabChange: () => {},
  playScreenClose: () => {},
  playPickerTick: () => {},
  playPodcastPause: () => {},
});

const SOUND_SOURCES = {
  confirm: require("../../sounds/newconfirm.mp3"),
  select: require("../../sounds/newselectsound.mp3"),
  back: require("../../sounds/newbacksound.mp3"),
  magic: require("../../sounds/magic.wav"),
  save: require("../../sounds/bookmark_saved.wav"),
  unsave: require("../../sounds/bookmark_removed.wav"),
  error: require("../../sounds/error.wav"),
  refreshComplete: require("../../sounds/sync_complete.wav"),
  refreshStart: require("../../sounds/loading_start.wav"),
  offline: require("../../sounds/offline.wav"),
  reconnect: require("../../sounds/success.wav"),
  search: require("../../sounds/search_complete.wav"),
  session: require("../../sounds/session_start.wav"),
  podcastPlay: require("../../sounds/podcast_play.wav"),
  articleOpen: require("../../sounds/article_open.wav"),
  tip: require("../../sounds/tip_popup.wav"),
  welcome: require("../../sounds/welcome.wav"),
  tabChange: require("../../sounds/tab_change.wav"),
  screenClose: require("../../sounds/screen_close.wav"),
  pickerTick: require("../../sounds/picker_tick.wav"),
  podcastPause: require("../../sounds/podcast_pause.wav"),
} as const;

type SoundKey = keyof typeof SOUND_SOURCES;

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useAppContext();
  const soundsRef = useRef<Partial<Record<SoundKey, Audio.Sound>>>({});
  const pendingSoundRef = useRef<SoundKey | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const entries = Object.entries(SOUND_SOURCES) as [SoundKey, any][];
      await Promise.all(
        entries.map(async ([key, source]) => {
          const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
          if (mounted) {
            soundsRef.current[key] = sound;
          } else {
            sound.unloadAsync();
          }
        })
      );
      if (mounted && pendingSoundRef.current) {
        const key = pendingSoundRef.current;
        pendingSoundRef.current = null;
        soundsRef.current[key]
          ?.setPositionAsync(0)
          .then(() => soundsRef.current[key]?.playAsync())
          .catch(() => {});
      }
    })().catch(() => {});

    return () => {
      mounted = false;
      Object.values(soundsRef.current).forEach((s) => s?.unloadAsync());
      soundsRef.current = {};
    };
  }, []);

  const playSound = useCallback(
    (key: SoundKey) => {
      const soundEffectsEnabled = settings?.soundEffectsEnabled ?? true;
      if (!soundEffectsEnabled) return;

      const sound = soundsRef.current[key];
      if (!sound) {
        pendingSoundRef.current = key;
        return;
      }
      sound
        .setPositionAsync(0)
        .then(() => sound.playAsync())
        .catch(() => {});
    },
    [settings?.soundEffectsEnabled]
  );

  const playConfirm = useCallback(() => playSound("confirm"), [playSound]);
  const playSelect = useCallback(() => playSound("select"), [playSound]);
  const playBack = useCallback(() => playSound("back"), [playSound]);
  const playMagic = useCallback(() => playSound("magic"), [playSound]);
  const playSave = useCallback(() => playSound("save"), [playSound]);
  const playUnsave = useCallback(() => playSound("unsave"), [playSound]);
  const playError = useCallback(() => playSound("error"), [playSound]);
  const playRefreshComplete = useCallback(() => playSound("refreshComplete"), [playSound]);
  const playRefreshStart = useCallback(() => playSound("refreshStart"), [playSound]);
  const playOffline = useCallback(() => playSound("offline"), [playSound]);
  const playReconnect = useCallback(() => playSound("reconnect"), [playSound]);
  const playSearch = useCallback(() => playSound("search"), [playSound]);
  const playSession = useCallback(() => playSound("session"), [playSound]);
  const playPodcastPlay = useCallback(() => playSound("podcastPlay"), [playSound]);
  const playArticleOpen = useCallback(() => playSound("articleOpen"), [playSound]);
  const playTip = useCallback(() => playSound("tip"), [playSound]);
  const playWelcome = useCallback(() => playSound("welcome"), [playSound]);
  const playTabChange = useCallback(() => playSound("tabChange"), [playSound]);
  const playScreenClose = useCallback(() => playSound("screenClose"), [playSound]);
  const playPickerTick = useCallback(() => playSound("pickerTick"), [playSound]);
  const playPodcastPause = useCallback(() => playSound("podcastPause"), [playSound]);

  return (
    <SoundContext.Provider value={{
      playConfirm, playSelect, playBack, playMagic,
      playSave, playUnsave, playError, playRefreshComplete,
      playRefreshStart, playOffline, playReconnect, playSearch, playSession,
      playPodcastPlay, playArticleOpen, playTip, playWelcome,
      playTabChange, playScreenClose, playPickerTick, playPodcastPause,
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSounds = () => useContext(SoundContext);
