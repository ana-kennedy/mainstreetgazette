import type { StoryCluster } from "../../types/storyTypes";
import type { ClassificationResult, DisplayTreatment, NotificationPriority } from "../../types/classificationTypes";

export function classifyStoryClusterByRules(cluster: StoryCluster): ClassificationResult {
  const itemClassifications = cluster.items
    .filter((ci) => !ci.isHiddenDuplicate && ci.classification != null)
    .map((ci) => ci.classification!);

  if (itemClassifications.length === 0) {
    return {
      topics: [],
      contentIntent: [],
      importanceScore: 20,
      breakingScore: 0,
      locationConfidence: 0,
      entityConfidence: 0,
      isOfficialAnnouncement: cluster.officialSourcePresent,
      isRumorOrSpeculation: false,
      isReviewOrOpinion: false,
      isTripPlanningUseful: false,
      isAccessibilityRelevant: false,
      notificationPriority: "none",
      timelineBucket: "older",
      recommendedDisplayTreatment: "standard",
      shortAccessibleSummary: cluster.canonicalTitle,
      confidence: 0.3,
      signals: ["cluster:no_item_classifications"],
    };
  }

  const topics = Array.from(new Set(itemClassifications.flatMap((c) => c.topics)));
  const contentIntent = Array.from(new Set(itemClassifications.flatMap((c) => c.contentIntent)));
  const hasOfficial = cluster.officialSourcePresent || itemClassifications.some((c) => c.isOfficialAnnouncement);
  const hasRumor = itemClassifications.some((c) => c.isRumorOrSpeculation);
  const hasAccessibility = itemClassifications.some((c) => c.isAccessibilityRelevant);
  const mediaTypes = Array.from(new Set(cluster.items.map((ci) => ci.contentType)));

  let importanceScore = Math.max(...itemClassifications.map((c) => c.importanceScore), 20);
  if (cluster.sourceCount >= 3) importanceScore += 10;
  if (cluster.sourceCount >= 5) importanceScore += 10;
  if (hasOfficial) importanceScore += 15;
  importanceScore = Math.min(100, importanceScore);

  const breakingScore = Math.min(100, importanceScore + (topics.includes("breaking_news") ? 10 : 0));

  const notificationPriority: NotificationPriority =
    importanceScore >= 80 ? "breaking" :
    importanceScore >= 65 ? "high" :
    importanceScore >= 45 ? "normal" :
    importanceScore >= 25 ? "low" :
    "none";

  const recommendedDisplayTreatment: DisplayTreatment =
    notificationPriority === "breaking" ? "breaking_card" :
    hasOfficial ? "official_card" :
    "standard";

  const mediaLine = mediaTypes.length > 1
    ? `. Includes ${mediaTypes.join(", ")}`
    : "";
  const shortAccessibleSummary =
    `${cluster.canonicalTitle}. ${cluster.sourceCount} source${cluster.sourceCount !== 1 ? "s" : ""}${mediaLine}.`;

  return {
    topics,
    contentIntent,
    importanceScore,
    breakingScore,
    locationConfidence: Math.max(...itemClassifications.map((c) => c.locationConfidence), 0),
    entityConfidence: Math.max(...itemClassifications.map((c) => c.entityConfidence), 0),
    isOfficialAnnouncement: hasOfficial,
    isRumorOrSpeculation: hasRumor && !hasOfficial,
    isReviewOrOpinion: itemClassifications.every((c) => c.isReviewOrOpinion),
    isTripPlanningUseful: itemClassifications.some((c) => c.isTripPlanningUseful),
    isAccessibilityRelevant: hasAccessibility,
    notificationPriority,
    timelineBucket: itemClassifications[0]?.timelineBucket ?? "older",
    recommendedDisplayTreatment,
    shortAccessibleSummary,
    confidence: Math.max(...itemClassifications.map((c) => c.confidence), 0.5),
    signals: [
      `cluster:sources:${cluster.sourceCount}`,
      `cluster:items:${cluster.items.length}`,
    ],
  };
}
