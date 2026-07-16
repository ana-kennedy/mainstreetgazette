import type { ClassificationResult, NotificationPriority } from "../../types/classificationTypes";

export interface UserNewsPreferences {
  disabledTopics?: string[];
  disabledSourceIds?: string[];
  hideRumors?: boolean;
  onlyOfficial?: boolean;
  importantOnly?: boolean;
}

export function applyUserNotificationPreferences(
  classification: ClassificationResult,
  sourceId: string,
  preferences: UserNewsPreferences
): NotificationPriority {
  if (preferences.disabledSourceIds?.includes(sourceId)) return "none";
  if (classification.topics.some((t) => preferences.disabledTopics?.includes(t))) return "none";
  if (preferences.hideRumors && classification.isRumorOrSpeculation) return "none";
  if (preferences.onlyOfficial && !classification.isOfficialAnnouncement) return "none";
  if (preferences.importantOnly && classification.importanceScore < 65) return "none";
  return classification.notificationPriority;
}
