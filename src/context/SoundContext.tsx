import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { Audio } from "expo-av";

type SoundContextValue = {
  playConfirm: () => void;
  playSelect: () => void;
  playBack: () => void;
  playMagic: () => void;
};

const SoundContext = createContext<SoundContextValue>({
  playConfirm: () => {},
  playSelect: () => {},
  playBack: () => {},
  playMagic: () => {}
});

const SOUND_SOURCES = {
  confirm: require("../../sounds/newconfirm.mp3"),
  select: require("../../sounds/newselectsound.mp3"),
  back: require("../../sounds/newbacksound.mp3"),
  magic: require("../../sounds/magic.wav")
} as const;

type SoundKey = keyof typeof SOUND_SOURCES;

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const soundsRef = useRef<Partial<Record<SoundKey, Audio.Sound>>>({});
  // Holds a sound requested before loading finished so it plays as soon as ready
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
      // Play any sound that was requested before loading completed (e.g. magic on launch)
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

  const playSound = useCallback((key: SoundKey) => {
    const sound = soundsRef.current[key];
    if (!sound) {
      // Sounds not loaded yet — queue this one to play when ready
      pendingSoundRef.current = key;
      return;
    }
    sound
      .setPositionAsync(0)
      .then(() => sound.playAsync())
      .catch(() => {});
  }, []);

  const playConfirm = useCallback(() => playSound("confirm"), [playSound]);
  const playSelect = useCallback(() => playSound("select"), [playSound]);
  const playBack = useCallback(() => playSound("back"), [playSound]);
  const playMagic = useCallback(() => playSound("magic"), [playSound]);

  return (
    <SoundContext.Provider value={{ playConfirm, playSelect, playBack, playMagic }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSounds = () => useContext(SoundContext);
