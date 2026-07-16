import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "mainstreetgazette.savedCollectionIDs.v1";

export function useCollections() {
  const [savedCollectionIDs, setSavedCollectionIDs] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed)) setSavedCollectionIDs(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const toggleSaveCollection = useCallback(async (id: string) => {
    setSavedCollectionIDs((current) => {
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (id: string) => savedCollectionIDs.includes(id),
    [savedCollectionIDs],
  );

  return { savedCollectionIDs, toggleSaveCollection, isSaved, isLoaded };
}
