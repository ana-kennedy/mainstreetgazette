import type { ClassificationResult } from "../../types/classificationTypes";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function mergeClassificationResults(
  ruleResult: ClassificationResult,
  aiResult?: Partial<ClassificationResult> | null
): ClassificationResult {
  if (!aiResult) return ruleResult;

  const aiConfidence = aiResult.confidence ?? 0;
  const trustAi = aiConfidence >= 0.7;

  return {
    ...ruleResult,
    topics: unique([...ruleResult.topics, ...((trustAi && aiResult.topics) || [])]),
    contentIntent: unique([...ruleResult.contentIntent, ...((trustAi && aiResult.contentIntent) || [])]),
    importanceScore:
      trustAi && typeof aiResult.importanceScore === "number"
        ? Math.round(ruleResult.importanceScore * 0.55 + aiResult.importanceScore * 0.45)
        : ruleResult.importanceScore,
    breakingScore:
      trustAi && typeof aiResult.breakingScore === "number"
        ? Math.round(ruleResult.breakingScore * 0.55 + aiResult.breakingScore * 0.45)
        : ruleResult.breakingScore,
    locationConfidence: Math.max(ruleResult.locationConfidence, aiResult.locationConfidence ?? 0),
    entityConfidence: Math.max(ruleResult.entityConfidence, aiResult.entityConfidence ?? 0),
    isOfficialAnnouncement: ruleResult.isOfficialAnnouncement || Boolean(trustAi && aiResult.isOfficialAnnouncement),
    isRumorOrSpeculation: ruleResult.isRumorOrSpeculation || Boolean(trustAi && aiResult.isRumorOrSpeculation),
    isReviewOrOpinion: ruleResult.isReviewOrOpinion || Boolean(trustAi && aiResult.isReviewOrOpinion),
    isTripPlanningUseful: ruleResult.isTripPlanningUseful || Boolean(trustAi && aiResult.isTripPlanningUseful),
    isAccessibilityRelevant: ruleResult.isAccessibilityRelevant || Boolean(trustAi && aiResult.isAccessibilityRelevant),
    notificationPriority: trustAi && aiResult.notificationPriority ? aiResult.notificationPriority : ruleResult.notificationPriority,
    timelineBucket: aiResult.timelineBucket ?? ruleResult.timelineBucket,
    recommendedDisplayTreatment:
      trustAi && aiResult.recommendedDisplayTreatment
        ? aiResult.recommendedDisplayTreatment
        : ruleResult.recommendedDisplayTreatment,
    shortAccessibleSummary:
      trustAi && aiResult.shortAccessibleSummary
        ? aiResult.shortAccessibleSummary
        : ruleResult.shortAccessibleSummary,
    confidence: Math.max(ruleResult.confidence, aiConfidence),
    signals: unique([...ruleResult.signals, trustAi ? "ai:merged" : "ai:ignored_low_confidence"]),
  };
}
