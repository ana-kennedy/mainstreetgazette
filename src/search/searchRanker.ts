import type { ParsedSearchQuery, SearchableItem, SearchResult } from "./searchTypes";
import { normalizeText } from "./searchNormalizer";

const DAY_MS = 24 * 60 * 60 * 1000;

function freshnessBoost(publishedAt?: string): number {
  if (!publishedAt) return 0;
  const ageDays = (Date.now() - new Date(publishedAt).getTime()) / DAY_MS;
  if (ageDays < 1) return 20;
  if (ageDays < 7) return 12;
  if (ageDays < 31) return 6;
  return 0;
}

export function rankSearchItem(
  parsed: ParsedSearchQuery,
  item: SearchableItem
): SearchResult | null {
  if (!parsed.tokens.length) return null;

  let score = 0;
  const matchedReasons: string[] = [];

  const normTitle = normalizeText(item.title);
  const normSummary = normalizeText(item.summary ?? "");
  const normBody = normalizeText(item.bodyText ?? "");
  const normSource = normalizeText(item.sourceName ?? "");

  // Exact full-query match in title
  if (normTitle.includes(parsed.normalizedQuery)) {
    score += 45;
    matchedReasons.push("Exact title match");
  }

  // Per-token title match
  const titleTokenHits = parsed.tokens.filter((t) => normTitle.includes(t)).length;
  if (titleTokenHits > 0) {
    score += titleTokenHits * 8;
    if (!matchedReasons.includes("Exact title match")) matchedReasons.push("Title keyword match");
  }

  // Summary match
  const summaryHits = parsed.tokens.filter((t) => normSummary.includes(t)).length;
  if (summaryHits > 0) {
    score += summaryHits * 5;
    matchedReasons.push("Summary keyword match");
  }

  // Body/entity name match (entity names and topic names stored here)
  const bodyHits = parsed.tokens.filter((t) => normBody.includes(t)).length;
  if (bodyHits > 0) {
    score += Math.min(bodyHits * 4, 40);
    matchedReasons.push("Entity or topic match");
  }

  // Source name match
  if (parsed.tokens.some((t) => normSource.includes(t))) {
    score += 20;
    matchedReasons.push("Source name match");
  }

  // Media type match
  if (
    parsed.mediaTypes.length > 0 &&
    item.mediaType &&
    parsed.mediaTypes.includes(item.mediaType)
  ) {
    score += 25;
    matchedReasons.push(`${item.mediaType} match`);
  }

  // Official source boost (when query mentions official/announcement)
  if (parsed.officialOnly && item.sourceTrust === "official") {
    score += 35;
    matchedReasons.push("Official source");
  }

  // Trust boosts
  if (item.sourceTrust === "official") score += 10;
  if (item.sourceTrust === "high") score += 15;
  if (item.sourceTrust === "medium") score += 8;

  // Story cluster bonus (multi-source coverage)
  if (item.resultType === "story") {
    score += 10;
  }

  // Freshness
  const fresh = freshnessBoost(item.publishedAt ?? item.updatedAt);
  if (fresh > 0) score += fresh;

  // Penalties
  if (item.isPromotionalDuplicate) score -= 50;
  if ((item.classifierConfidence ?? 1) < 0.5) score -= 15;

  if (score <= 0) return null;

  const typeLabel =
    item.resultType === "story"
      ? "story"
      : item.resultType === "contentItem"
        ? item.mediaType ?? "article"
        : item.resultType;

  const a11yLabel = [
    typeLabel,
    item.title,
    item.sourceName,
    matchedReasons.length > 0 ? `Matches ${matchedReasons.slice(0, 2).join(", ")}` : undefined,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    id: item.id,
    resultType: item.resultType,
    title: item.title,
    subtitle: item.subtitle,
    description: item.summary,
    sourceName: item.sourceName,
    mediaType: item.mediaType,
    score,
    matchedReasons,
    originalItem: item,
    accessibilityLabel: a11yLabel,
    accessibilityHint: "Double tap to open this result.",
  };
}
