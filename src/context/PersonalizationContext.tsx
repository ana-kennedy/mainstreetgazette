import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { defaultPersonalizationPreferences } from "../personalization/preferenceDefaults";
import {
  loadPersonalizationPreferences,
  savePersonalizationPreferences,
} from "../personalization/preferenceStorage";
import type { NewsFeedMode, UserPersonalizationPreferences } from "../personalization/personalizationTypes";

interface PersonalizationContextValue {
  prefs: UserPersonalizationPreferences;
  isLoaded: boolean;
  updatePrefs: (update: Partial<UserPersonalizationPreferences>) => void;
  setNewsFeedMode: (mode: NewsFeedMode) => void;
}

const PersonalizationContext = createContext<PersonalizationContextValue>({
  prefs: defaultPersonalizationPreferences,
  isLoaded: false,
  updatePrefs: () => {},
  setNewsFeedMode: () => {},
});

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPersonalizationPreferences>(
    defaultPersonalizationPreferences
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadPersonalizationPreferences()
      .then((loaded) => {
        setPrefs(loaded);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  const updatePrefs = useCallback((update: Partial<UserPersonalizationPreferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...update };
      savePersonalizationPreferences(next).catch(() => {});
      return next;
    });
  }, []);

  const setNewsFeedMode = useCallback((mode: NewsFeedMode) => {
    setPrefs((current) => {
      const next = { ...current, newsFeedMode: mode };
      savePersonalizationPreferences(next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <PersonalizationContext.Provider value={{ prefs, isLoaded, updatePrefs, setNewsFeedMode }}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  return useContext(PersonalizationContext);
}
