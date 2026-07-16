// Phase 57 — Companion Mode
// Tracks whether the user is "at the park" (active companion session) and which park.
// Persisted across app launches so the mode survives backgrounding.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@msg/companionMode";

interface CompanionModeState {
  isActive: boolean;
  activeParkId: string | null;
  activeSince: string | null;
}

interface CompanionModeContextValue extends CompanionModeState {
  startSession: (parkId: string) => void;
  endSession: () => void;
}

const CompanionModeContext = createContext<CompanionModeContextValue>({
  isActive: false,
  activeParkId: null,
  activeSince: null,
  startSession: () => {},
  endSession: () => {},
});

export function CompanionModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CompanionModeState>({
    isActive: false,
    activeParkId: null,
    activeSince: null,
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setState(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: CompanionModeState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const startSession = useCallback((parkId: string) => {
    persist({ isActive: true, activeParkId: parkId, activeSince: new Date().toISOString() });
  }, [persist]);

  const endSession = useCallback(() => {
    persist({ isActive: false, activeParkId: null, activeSince: null });
  }, [persist]);

  return (
    <CompanionModeContext.Provider value={{ ...state, startSession, endSession }}>
      {children}
    </CompanionModeContext.Provider>
  );
}

export const useCompanionMode = () => useContext(CompanionModeContext);
