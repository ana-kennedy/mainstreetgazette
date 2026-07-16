// Phase 22 — Trip Planning Intelligence

export type TripTip = "avoid_date" | "best_time" | "event_overlap" | "refurb_alert" | "new_attraction" | "crowd_alert";

export interface TripPlanningTip {
  id: string;
  type: TripTip;
  headline: string;
  detail?: string;
  urgency: "info" | "caution" | "highlight";
  accessibilityLabel: string;
}

export interface TripPlanningIntelligence {
  parkTagKey: string;
  tips: TripPlanningTip[];
  hasUrgentTip: boolean;
  computedAt: number;
}
