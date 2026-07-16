import type {
  PersonalizationResult,
  StoryClusterLike,
  UserPersonalizationPreferences,
} from "./personalizationTypes";

function intersects(a: string[], b: string[]): boolean {
  return a.some((v) => b.includes(v));
}

function allMediaHidden(
  story: StoryClusterLike,
  prefs: UserPersonalizationPreferences
): boolean {
  if (story.mediaTypes.length === 0) return false;
  return story.mediaTypes.every((t) => prefs.hiddenMediaTypes.includes(t));
}

export function personalizeStory(
  story: StoryClusterLike,
  prefs: UserPersonalizationPreferences
): PersonalizationResult {
  let score = 0;
  const reasons: string[] = [];
  const matchedFavorites: string[] = [];
  const matchedMutes: string[] = [];

  if (intersects(story.locationIds, prefs.mutedLocations)) matchedMutes.push("Muted location");
  if (intersects(story.parkIds, prefs.mutedParks)) matchedMutes.push("Muted park");
  if (intersects(story.entityIds, prefs.mutedEntities)) matchedMutes.push("Muted entity");
  if (intersects(story.topicIds, prefs.mutedTopics)) matchedMutes.push("Muted topic");

  const allSourcesMuted =
    story.sourceIds.length > 0 &&
    story.sourceIds.every((id) => prefs.mutedSources.includes(id));

  const bypassOfficial =
    prefs.allowOfficialAnnouncementsAlways && story.isOfficialAnnouncement;
  const hiddenByMute = matchedMutes.length > 0 && !bypassOfficial;

  if (hiddenByMute || allSourcesMuted || allMediaHidden(story, prefs)) {
    return {
      score: -1000,
      hidden: true,
      reasons: matchedMutes.length > 0 ? matchedMutes : ["Hidden by source or media type settings"],
      matchedFavorites,
      matchedMutes,
    };
  }

  if (intersects(story.locationIds, prefs.favoriteLocations)) {
    score += 20;
    reasons.push("Matches favorite location");
    matchedFavorites.push("Location");
  }
  if (intersects(story.parkIds, prefs.favoriteParks)) {
    score += 30;
    reasons.push("Matches favorite park");
    matchedFavorites.push("Park");
  }
  if (intersects(story.entityIds, prefs.favoriteEntities)) {
    score += 40;
    reasons.push("Matches favorite entity");
    matchedFavorites.push("Entity");
  }
  if (intersects(story.topicIds, prefs.favoriteTopics)) {
    score += 25;
    reasons.push("Matches favorite topic");
    matchedFavorites.push("Topic");
  }
  if (intersects(story.sourceIds, prefs.preferredSources)) {
    score += 15;
    reasons.push("Preferred source");
  }
  if (story.mediaTypes.some((t) => prefs.preferredMediaTypes.includes(t))) {
    score += 10;
    reasons.push("Preferred media type");
  }
  if (story.isOfficialAnnouncement) {
    score += 35;
    reasons.push("Official announcement");
  }
  if (story.isBreaking) {
    score += 30;
    reasons.push("Breaking news");
  }
  if ((story.importanceScore ?? 0) >= 80) {
    score += 20;
    reasons.push("High importance");
  }
  if (story.sourceIds.length >= 3) {
    score += 15;
    reasons.push("Multiple sources");
  }
  if ((story.classificationConfidence ?? 1) < 0.45) {
    score -= 20;
    reasons.push("Low classification confidence");
  }

  return { score, hidden: false, reasons, matchedFavorites, matchedMutes };
}

// Human-readable labels for whichever favorites a story matched (e.g. "Magic Kingdom",
// "Merchandise") — used for the optional "why recommended" caption on feed cards.
// Name maps are passed in rather than imported here so this stays free of UI/taxonomy coupling.
export function describeMatchedFavoriteLabels(
  story: StoryClusterLike,
  prefs: UserPersonalizationPreferences,
  nameMaps: {
    locations: Record<string, string>;
    parks: Record<string, string>;
    topics: Record<string, string>;
  }
): string[] {
  const labels: string[] = [];
  for (const id of story.locationIds) {
    if (prefs.favoriteLocations.includes(id)) labels.push(nameMaps.locations[id] ?? id);
  }
  for (const id of story.parkIds) {
    if (prefs.favoriteParks.includes(id)) labels.push(nameMaps.parks[id] ?? id);
  }
  for (const id of story.topicIds) {
    if (prefs.favoriteTopics.includes(id)) labels.push(nameMaps.topics[id] ?? id);
  }
  return labels;
}

export function rankPersonalizedStories<T extends StoryClusterLike>(
  stories: T[],
  prefs: UserPersonalizationPreferences
): Array<T & { personalization: PersonalizationResult }> {
  return stories
    .map((story) => ({ ...story, personalization: personalizeStory(story, prefs) }))
    .filter((s) => !s.personalization.hidden)
    .sort((a, b) => {
      if (prefs.newsFeedMode === "latest" || prefs.newsFeedMode === "all") {
        return (
          new Date(b.publishedAt ?? 0).getTime() -
          new Date(a.publishedAt ?? 0).getTime()
        );
      }
      return b.personalization.score - a.personalization.score;
    });
}
