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
  confirm: require("../../sounds/confirm.wav"),
  select: require("../../sounds/select.wav"),
  back: require("../../sounds/back.wav"),
  magic: require("../../sounds/magic.wav")
} as const;

type SoundKey = keyof typeof SOUND_SOURCES;

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const soundsRef = useRef<Partial<Record<SoundKey, Audio.Sound>>>({});

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
    })().catch(() => {});

    return () => {
      mounted = false;
      Object.values(soundsRef.current).forEach((s) => s?.unloadAsync());
      soundsRef.current = {};
    };
  }, []);

  const playSound = useCallback((key: SoundKey) => {
    const sound = soundsRef.current[key];
    if (!sound) return;
    sound
      .setPositionAsync(0)
      .then(() => sound.playAsync())
      .catch(() => {});
  }, []);

  const playConfirm = useCallback(() => playSound("select"), [playSound]);
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
