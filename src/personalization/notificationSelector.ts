import type { StoryClusterLike, UserPersonalizationPreferences } from "./personalizationTypes";
import { personalizeStory } from "./personalizationEngine";

const MIN_IMPORTANCE_BY_PROFILE: Record<string, number> = {
  quiet: 85,
  balanced: 70,
  breaking_heavy: 55,
};

export function shouldNotifyForStory(
  story: StoryClusterLike,
  prefs: UserPersonalizationPreferences
): { notify: boolean; reason?: string } {
  const result = personalizeStory(story, prefs);
  if (result.hidden) {
    return { notify: false, reason: "Hidden by personalization settings" };
  }

  if (prefs.breakingNewsOnly && !story.isBreaking && !story.isOfficialAnnouncement) {
    return { notify: false, reason: "User selected breaking news only" };
  }

  if (story.isOfficialAnnouncement && prefs.allowOfficialAnnouncementsAlways) {
    return { notify: true, reason: "Official announcement" };
  }

  const minImportance = MIN_IMPORTANCE_BY_PROFILE[prefs.notificationProfile] ?? 70;
  const importance = story.importanceScore ?? result.score;

  if (importance >= minImportance) {
    return {
      notify: true,
      reason: `Meets ${prefs.notificationProfile} notification threshold`,
    };
  }

  if (result.matchedFavorites.length > 0 && importance >= 50) {
    return { notify: true, reason: "Matches favorites" };
  }

  return { notify: false, reason: "Below notification threshold" };
}
