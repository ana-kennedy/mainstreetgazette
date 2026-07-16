import type { ContentType, SourceType } from "../../domain/models";
import type { EntityMatch } from "../../domain/models";
import type { ClassificationResult, ClassificationTimelineBucket, DisplayTreatment, NotificationPriority } from "../../types/classificationTypes";

const TOPIC_KEYWORDS: Record<string, string[]> = {
  official_announcement: ["officially announced", "announced by disney", "disney parks blog", "official disney"],
  breaking_news: ["breaking", "just announced", "confirmed", "now open", "opening date", "closing date"],
  ride_closure_refurbishment: ["closure", "closed", "refurbishment", "refurb", "temporarily unavailable", "reopening", "downtime"],
  new_attraction: ["new attraction", "new ride", "coming to", "expansion", "land announced", "opening in"],
  construction: ["construction", "construction walls", "permit", "demolition", "site work", "progress", "crane"],
  dining: ["menu", "restaurant", "snack", "food booth", "dining", "eats", "treat", "festival food"],
  entertainment: ["parade", "fireworks", "nighttime spectacular", "show", "stage show", "character", "meet and greet"],
  transportation: ["monorail", "skyliner", "bus", "boat", "ferry", "tram", "parking"],
  tickets_pricing: ["ticket", "price", "pricing", "annual pass", "lightning lane", "multi pass", "single pass"],
  accessibility: ["accessibility", "das", "disability access", "wheelchair", "blind", "deaf", "audio description", "closed captioning", "sensory", "service animal"],
  rumor_speculation: ["rumor", "reportedly", "speculation", "unconfirmed", "could be", "may be", "allegedly"],
  review_opinion: ["review", "our thoughts", "honest thoughts", "worth it", "ranking", "best and worst", "guide", "tips"],
  cruise_line: ["disney cruise", "cruise line", "ship", "itinerary", "castaway cay", "lookout cay"],
};

function sourceTypeToPlatformLabel(sourceType: SourceType): string {
  switch (sourceType) {
    case "youtubeChannel": return "youtube";
    case "podcastRSS": return "podcast";
    case "redditFeed": return "reddit";
    default: return "rss";
  }
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w.toLowerCase()));
}

function classificationBucket(publishedAt: string): ClassificationTimelineBucket {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 36e5;
  if (ageHours <= 3) return "now";
  if (ageHours <= 24) return "today";
  if (ageHours <= 48) return "yesterday";
  if (ageHours <= 168) return "this_week";
  return "older";
}

export interface ClassifiableItem {
  title: string;
  summary?: string | null;
  sourceName: string;
  sourceType: SourceType;
  contentType: ContentType;
  publishedAt: string;
  isOfficialSource: boolean;
  entityMatches?: EntityMatch[];
}

export function classifyContentItemByRules(item: ClassifiableItem): ClassificationResult {
  const text = `${item.title} ${item.summary ?? ""} ${item.sourceName}`.toLowerCase();
  const platform = sourceTypeToPlatformLabel(item.sourceType);

  const topics: string[] = [];
  const signals: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (includesAny(text, keywords)) {
      topics.push(topic);
      signals.push(`keyword:${topic}`);
    }
  }

  const contentIntent: string[] = [];
  if (platform === "youtube") contentIntent.push("reaction");
  if (platform === "podcast") contentIntent.push("analysis");
  if (platform === "reddit") contentIntent.push("community_question");
  if (item.contentType === "article") contentIntent.push("reporting");
  if (topics.includes("review_opinion")) contentIntent.push("review");

  const isOfficialAnnouncement = item.isOfficialSource || topics.includes("official_announcement");
  const isRumorOrSpeculation = topics.includes("rumor_speculation");
  const isReviewOrOpinion = topics.includes("review_opinion");
  const isAccessibilityRelevant = topics.includes("accessibility");
  const isTripPlanningUseful = includesAny(text, ["guide", "tips", "planning", "worth it", "best time", "strategy"]);

  let importanceScore = 20;
  if (isOfficialAnnouncement) importanceScore += 25;
  if (topics.includes("breaking_news")) importanceScore += 20;
  if (topics.includes("ride_closure_refurbishment")) importanceScore += 15;
  if (topics.includes("new_attraction")) importanceScore += 18;
  if (topics.includes("tickets_pricing")) importanceScore += 15;
  if (topics.includes("transportation")) importanceScore += 12;
  if (topics.includes("accessibility")) importanceScore += 18;
  if (topics.includes("construction")) importanceScore += 8;
  if (topics.includes("dining")) importanceScore += 5;
  if (isReviewOrOpinion) importanceScore -= 6;
  if (isRumorOrSpeculation && !isOfficialAnnouncement) importanceScore -= 12;
  if (platform === "youtube" || platform === "podcast") importanceScore -= 4;
  importanceScore = Math.max(0, Math.min(100, importanceScore));

  const breakingScore = Math.min(100, importanceScore + (topics.includes("breaking_news") ? 15 : 0));

  const entityConfidence = Math.max(...(item.entityMatches?.map((e) => e.score / 100) ?? [0]));
  const locationConfidence = entityConfidence > 0 ? Math.min(1, entityConfidence + 0.1) : 0;

  const notificationPriority: NotificationPriority =
    importanceScore >= 80 ? "breaking" :
    importanceScore >= 65 ? "high" :
    importanceScore >= 45 ? "normal" :
    importanceScore >= 25 ? "low" :
    "none";

  const recommendedDisplayTreatment: DisplayTreatment =
    notificationPriority === "breaking" ? "breaking_card" :
    isOfficialAnnouncement ? "official_card" :
    platform === "youtube" || platform === "podcast" ? "media_card" :
    platform === "reddit" ? "community_card" :
    "standard";

  const mainTopic = topics[0]?.replace(/_/g, " ") ?? "Disney news";
  const shortAccessibleSummary = `${item.sourceName}. ${mainTopic}. ${item.title}`;

  return {
    topics,
    contentIntent: Array.from(new Set(contentIntent)),
    importanceScore,
    breakingScore,
    locationConfidence,
    entityConfidence,
    isOfficialAnnouncement,
    isRumorOrSpeculation,
    isReviewOrOpinion,
    isTripPlanningUseful,
    isAccessibilityRelevant,
    notificationPriority,
    timelineBucket: classificationBucket(item.publishedAt),
    recommendedDisplayTreatment,
    shortAccessibleSummary,
    confidence: topics.length > 0 ? 0.72 : 0.45,
    signals,
  };
}
