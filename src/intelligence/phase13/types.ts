// Phase 13 — Event Calendar types
// Depends on: Phase 3 (StoryCluster), Phase 7 (UserPersonalizationPreferences)

export type EventType =
  | "festival"
  | "ticketed_party"
  | "refurbishment"
  | "cruise_sailing"
  | "movie_release"
  | "disney_plus_release"
  | "rundisney";

export type EventStatus = "upcoming" | "active" | "ending_soon" | "ended";

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  // ISO date strings (date-only: "YYYY-MM-DD")
  startDate: string;
  endDate?: string;
  parkIds: string[];
  entityIds: string[];
  description?: string;
  // Cluster IDs from Phase 3 that cover this event
  relatedClusterIds: string[];
  isConfirmed: boolean;
  daysUntilStart: number;
  daysUntilEnd?: number;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export interface EventCalendar {
  active: CalendarEvent[];
  endingSoon: CalendarEvent[];
  upcoming: CalendarEvent[];
  computedAt: number;
}
