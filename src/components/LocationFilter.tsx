import type { LocationFilterKey, TimelineWindow } from "../domain/models";

export const LOCATION_ORDER: LocationFilterKey[] = ["all", "wdw", "dlr", "dcl", "international"];

export const TIMELINE_WINDOW_ORDER: TimelineWindow[] = ["all", "now", "today", "last_3_days", "week", "month"];

// Maps TimelineWindow → max age in hours (undefined = no limit)
export const TIMELINE_WINDOW_HOURS: Record<TimelineWindow, number | undefined> = {
  all: undefined,
  now: 6,
  today: 24,
  last_3_days: 72,
  week: 168,
  month: 720,
};
