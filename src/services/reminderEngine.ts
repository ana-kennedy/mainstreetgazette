// Phase 08 — versioned, externally maintainable reminder rules for Trip Companion.
// Per the spec: "Never hard-code mutable Disney policy without an effective date and
// destination scope." Rules live in data/phase24/reminderRules.json (version +
// effectiveDate at the file level, destinationScope per rule) rather than as TS
// constants, so updating a window (e.g. dining opens at a different day count) is a
// data change, not a code change — mirroring this codebase's existing JSON-data-file
// pattern (data/phase13/events.json, data/phase10/collections.json) rather than the
// hard-coded rules.ts constants used elsewhere, which the spec explicitly warns against.
import type { Trip } from "../domain/models";
import reminderRulesData from "../data/phase24/reminderRules.json";
import { cancelScheduledNotification, scheduleNotificationAt } from "./pushNotifications";

export type ReminderType =
  | "dining_window"
  | "lightning_lane_window"
  | "check_in"
  | "weather_usefulness"
  | "park_hour_review";

export interface ReminderRule {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  daysBeforeStart: number;
  destinationScope: string[];
  requiresResort?: boolean;
}

interface ReminderRuleSet {
  version: number;
  effectiveDate: string;
  rules: ReminderRule[];
}

export interface TripReminder {
  id: string;
  tripId: string;
  ruleId: string;
  type: ReminderType;
  title: string;
  description: string;
  dueDate: Date;
}

const RULE_SET = reminderRulesData as ReminderRuleSet;

export function getReminderRuleSetInfo(): { version: number; effectiveDate: string } {
  return { version: RULE_SET.version, effectiveDate: RULE_SET.effectiveDate };
}

function dueDateFor(trip: Trip, daysBeforeStart: number): Date {
  const due = new Date(`${trip.startDate}T09:00:00`);
  due.setDate(due.getDate() - daysBeforeStart);
  return due;
}

export function computeTripReminders(trip: Trip): TripReminder[] {
  return RULE_SET.rules
    .filter((rule) => rule.destinationScope.includes(trip.destinationId))
    .filter((rule) => !rule.requiresResort || Boolean(trip.resort))
    .map((rule) => ({
      id: `trip_${trip.id}_${rule.id}`,
      tripId: trip.id,
      ruleId: rule.id,
      type: rule.type,
      title: rule.title,
      description: rule.description,
      dueDate: dueDateFor(trip, rule.daysBeforeStart),
    }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export function computeUpcomingReminders(trips: Trip[], now: Date = new Date()): TripReminder[] {
  return trips
    .flatMap((trip) => computeTripReminders(trip))
    .filter((r) => r.dueDate.getTime() >= now.getTime())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// Schedules a real on-device notification for every still-future reminder for this
// trip. Safe to call repeatedly (e.g. after editing a trip's dates) — scheduling with
// the same identifier replaces any existing one.
export async function scheduleTripReminders(trip: Trip): Promise<void> {
  const reminders = computeTripReminders(trip).filter((r) => r.dueDate.getTime() > Date.now());
  await Promise.all(reminders.map((r) => scheduleNotificationAt(r.id, r.title, r.description, r.dueDate)));
}

export async function cancelTripReminders(trip: Trip): Promise<void> {
  const reminders = computeTripReminders(trip);
  await Promise.all(reminders.map((r) => cancelScheduledNotification(r.id)));
}
