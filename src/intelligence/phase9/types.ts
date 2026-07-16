// Phase 9 — Notification Intelligence types
// Depends on: Phase 3 (StoryCluster), Phase 4 (ClassificationResult), Phase 7 (UserPersonalizationPreferences)

export type NotificationType =
  | "breaking"
  | "official_announcement"
  | "entity_watch"
  | "park_alert"
  | "digest"
  | "standard"
  // Phase 08 — Gazette Alerts' "Disney Moments": gentle, non-urgent highlights
  // (anniversaries, seasonal touches, community spotlights), distinct from breaking/
  // official news. Gated by UserSettings.disneyMomentsEnabled.
  | "disney_moment";

export type NotificationSuppressReason =
  | "quiet_hours"
  | "muted_source"
  | "muted_topic"
  | "muted_entity"
  | "muted_park"
  | "below_threshold"
  | "breaking_only_mode"
  | "already_seen"
  | "low_confidence"
  | "disney_moments_disabled";

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  // VoiceOver-friendly version — more descriptive for screen reader users
  accessibilityBody: string;
  score: number;
  clusterId?: string;
  primaryItemId?: string;
  // Reason the notification was approved (for debug/accessibility mode)
  approvedReason: string;
}

export interface NotificationDecision {
  clusterId: string;
  shouldNotify: boolean;
  type: NotificationType;
  score: number;
  payload?: NotificationPayload;
  suppressedBy?: NotificationSuppressReason;
}

export interface DigestPayload {
  title: string;
  body: string;
  accessibilityBody: string;
  storyCount: number;
  topHeadlines: string[];
}

export interface NotificationBatch {
  immediate: NotificationPayload[];       // send now (breaking / entity watch / park alert)
  digest?: DigestPayload;                 // bundle into one digest notification
  suppressed: NotificationDecision[];     // decisions that were suppressed and why
  evaluatedAt: number;
}
