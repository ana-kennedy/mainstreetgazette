// Phase 08 — Trip Companion. Supports multiple upcoming trips, persisted independently
// of CompanionModeContext (which is a different, already-shipped concept: "I'm
// physically at a park right now," not trip planning — see PHASE_05_RESULTS.md).
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loadTrips, saveTrips } from "../services/storage";
import type { Trip } from "../domain/models";
import { cancelTripReminders } from "../services/reminderEngine";

interface TripCompanionContextValue {
  trips: Trip[];
  isLoaded: boolean;
  addTrip: (trip: Omit<Trip, "id" | "createdAt">) => Promise<Trip>;
  updateTrip: (id: string, patch: Partial<Omit<Trip, "id" | "createdAt">>) => Promise<void>;
  removeTrip: (id: string) => Promise<void>;
}

const TripCompanionContext = createContext<TripCompanionContextValue>({
  trips: [],
  isLoaded: false,
  addTrip: async (trip) => ({ ...trip, id: "", createdAt: "" }),
  updateTrip: async () => {},
  removeTrip: async () => {},
});

export function TripCompanionProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTrips()
      .then((loaded) => {
        setTrips(loaded);
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  const addTrip = useCallback(async (trip: Omit<Trip, "id" | "createdAt">) => {
    const newTrip: Trip = {
      ...trip,
      id: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...trips, newTrip];
    setTrips(next);
    await saveTrips(next);
    return newTrip;
  }, [trips]);

  const updateTrip = useCallback(async (id: string, patch: Partial<Omit<Trip, "id" | "createdAt">>) => {
    const next = trips.map((t) => (t.id === id ? { ...t, ...patch } : t));
    setTrips(next);
    await saveTrips(next);
  }, [trips]);

  const removeTrip = useCallback(async (id: string) => {
    const removed = trips.find((t) => t.id === id);
    const next = trips.filter((t) => t.id !== id);
    setTrips(next);
    await saveTrips(next);
    // Best-effort cleanup of any reminders scheduled for this trip — safe no-op if
    // none were ever scheduled (e.g. Trip Companion Alerts was off).
    if (removed) await cancelTripReminders(removed).catch(() => {});
  }, [trips]);

  return (
    <TripCompanionContext.Provider value={{ trips, isLoaded, addTrip, updateTrip, removeTrip }}>
      {children}
    </TripCompanionContext.Provider>
  );
}

export function useTripCompanion() {
  return useContext(TripCompanionContext);
}
