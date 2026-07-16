// Phase 13 — Event Calendar service
// Depends on:
//   Phase 3 (StoryCluster) — to link news clusters to calendar events by keyword detection
//   Phase 7 (UserPersonalizationPreferences) — optional, for future park/interest filtering

import type { StoryCluster } from "../../types/storyTypes";
import {
  EVENT_TYPE_KEYWORDS,
  EVENT_TYPE_LABELS,
  ENDING_SOON_DAYS,
  UPCOMING_HORIZON_DAYS,
  ACTIVE_EVENTS_LIMIT,
  ENDING_SOON_LIMIT,
  UPCOMING_EVENTS_LIMIT,
} from "./rules";
import type { CalendarEvent, EventCalendar, EventStatus, EventType } from "./types";

// ── Static event definition (from data/phase13/events.json) ──────────────────

export interface StaticEventDefinition {
  id: string;
  title: string;
  type: EventType;
  startDate: string;
  endDate?: string;
  parkIds: string[];
  entityIds: string[];
  description?: string;
  isConfirmed: boolean;
}

export interface EventCalendarInput {
  events: StaticEventDefinition[];
  clusters: StoryCluster[];
  now?: Date;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function parseDateLocal(dateStr: string): Date {
  // Parse "YYYY-MM-DD" as local midnight to avoid timezone-shift issues
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// ── Event status from dates ───────────────────────────────────────────────────

function resolveStatus(startDate: Date, endDate: Date | undefined, now: Date): EventStatus {
  if (now < startDate) return "upcoming";
  if (endDate && now > endDate) return "ended";
  if (endDate && daysBetween(now, endDate) <= ENDING_SOON_DAYS) return "ending_soon";
  return "active";
}

// ── Cluster matching ──────────────────────────────────────────────────────────

function clusterMatchesEvent(cluster: StoryCluster, event: StaticEventDefinition): boolean {
  const titleLower = cluster.canonicalTitle.toLowerCase();
  const titleWords = event.title.toLowerCase();
  // Direct title substring match
  if (titleLower.includes(titleWords) || titleWords.includes(titleLower.substring(0, 20))) {
    return true;
  }
  // Keyword match against this event's type keywords
  const keywords = EVENT_TYPE_KEYWORDS[event.type];
  return keywords.some((kw) =>
    titleLower.includes(kw.toLowerCase()) ||
    cluster.topics.some((t) => t.toLowerCase().includes(kw.toLowerCase())),
  );
}

function findRelatedClusters(event: StaticEventDefinition, clusters: StoryCluster[]): string[] {
  return clusters
    .filter((c) => clusterMatchesEvent(c, event))
    .map((c) => c.clusterId);
}

// ── Build a CalendarEvent ─────────────────────────────────────────────────────

function buildCalendarEvent(
  def: StaticEventDefinition,
  relatedClusterIds: string[],
  now: Date,
): CalendarEvent {
  const startDate = parseDateLocal(def.startDate);
  const endDate = def.endDate ? parseDateLocal(def.endDate) : undefined;
  const status = resolveStatus(startDate, endDate, now);

  const daysUntilStart = daysBetween(now, startDate);
  const daysUntilEnd = endDate ? daysBetween(now, endDate) : undefined;

  const typeLabel = EVENT_TYPE_LABELS[def.type];

  // Build natural-language a11y label
  let timePart: string;
  if (status === "active") {
    timePart = daysUntilEnd != null ? `Ends in ${daysUntilEnd} days.` : "Currently active.";
  } else if (status === "ending_soon") {
    timePart = `Ending soon — ${daysUntilEnd} days left.`;
  } else if (status === "upcoming") {
    timePart = daysUntilStart === 0 ? "Starts today." : `Starts in ${daysUntilStart} days.`;
  } else {
    timePart = "Ended.";
  }

  const parkLabel =
    def.parkIds.length === 1 ? def.parkIds[0].replace(/_/g, " ") : "";
  const a11yLabel = [
    def.title,
    typeLabel,
    parkLabel,
    timePart,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    id: def.id,
    title: def.title,
    type: def.type,
    status,
    startDate: def.startDate,
    endDate: def.endDate,
    parkIds: def.parkIds,
    entityIds: def.entityIds,
    description: def.description,
    relatedClusterIds,
    isConfirmed: def.isConfirmed,
    daysUntilStart,
    daysUntilEnd,
    accessibilityLabel: a11yLabel,
    accessibilityHint: "Double tap to see related news for this event.",
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function buildEventCalendar(input: EventCalendarInput): EventCalendar {
  const { events, clusters, now = new Date() } = input;
  const nowMs = now.getTime();
  const horizonMs = nowMs + UPCOMING_HORIZON_DAYS * 24 * 60 * 60 * 1000;

  const allEvents: CalendarEvent[] = [];

  for (const def of events) {
    const startDate = parseDateLocal(def.startDate);
    const endDate = def.endDate ? parseDateLocal(def.endDate) : undefined;

    // Skip events that ended more than a day ago
    if (endDate && endDate.getTime() < nowMs - 24 * 60 * 60 * 1000) continue;
    // Skip events starting beyond the horizon
    if (startDate.getTime() > horizonMs) continue;

    const relatedClusterIds = findRelatedClusters(def, clusters);
    allEvents.push(buildCalendarEvent(def, relatedClusterIds, now));
  }

  const active = allEvents
    .filter((e) => e.status === "active")
    .sort((a, b) => (a.daysUntilEnd ?? 999) - (b.daysUntilEnd ?? 999))
    .slice(0, ACTIVE_EVENTS_LIMIT);

  const endingSoon = allEvents
    .filter((e) => e.status === "ending_soon")
    .sort((a, b) => (a.daysUntilEnd ?? 0) - (b.daysUntilEnd ?? 0))
    .slice(0, ENDING_SOON_LIMIT);

  const upcoming = allEvents
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart)
    .slice(0, UPCOMING_EVENTS_LIMIT);

  return { active, endingSoon, upcoming, computedAt: nowMs };
}
