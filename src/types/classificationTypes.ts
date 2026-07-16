export type NotificationPriority = "none" | "low" | "normal" | "high" | "breaking";

export type ClassificationTimelineBucket =
  | "now"
  | "today"
  | "yesterday"
  | "this_week"
  | "older"
  | "evergreen";

export type DisplayTreatment =
  | "standard"
  | "breaking_card"
  | "official_card"
  | "media_card"
  | "community_card"
  | "digest_only";

export interface ClassificationResult {
  topics: string[];
  contentIntent: string[];
  importanceScore: number;
  breakingScore: number;
  locationConfidence: number;
  entityConfidence: number;
  isOfficialAnnouncement: boolean;
  isRumorOrSpeculation: boolean;
  isReviewOrOpinion: boolean;
  isTripPlanningUseful: boolean;
  isAccessibilityRelevant: boolean;
  notificationPriority: NotificationPriority;
  timelineBucket: ClassificationTimelineBucket;
  recommendedDisplayTreatment: DisplayTreatment;
  shortAccessibleSummary: string;
  confidence: number;
  signals: string[];
}
