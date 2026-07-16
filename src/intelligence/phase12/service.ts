// Phase 12 — Accessibility Intelligence service
// Depends on:
//   Phase 3 (StoryCluster, ClusteredItem) — headline, items, sourceCount, officialSourcePresent
//   Phase 4 (ClassificationResult) — importanceScore, isOfficialAnnouncement, breakingScore
//   Phase 7 (UserPersonalizationPreferences) — optional, for future personalization hooks

import type { StoryCluster } from "../../types/storyTypes";
import {
  ACCESSIBILITY_KEYWORDS,
  CATEGORY_BASE_SCORES,
  ACCESSIBILITY_SCORE_BONUSES,
  ACCESSIBILITY_HUB_LIMIT,
  DAS_UPDATES_LIMIT,
  MIN_ACCESSIBILITY_SCORE,
  VELOCITY_WINDOW_24H_MS,
  VELOCITY_WINDOW_72H_MS,
} from "./rules";
import type { AccessibilityCategory, AccessibilityHub, AccessibilityStory } from "./types";

export interface AccessibilityInput {
  clusters: StoryCluster[];
  now?: Date;
}

// ── Keyword matching ──────────────────────────────────────────────────────────

function matchesKeyword(text: string, keyword: string): boolean {
  // Word-boundary aware match — avoids matching "mobility" inside "automobile"
  return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function detectCategories(cluster: StoryCluster): AccessibilityCategory[] {
  const searchText = [
    cluster.canonicalTitle,
    cluster.shortSummary ?? "",
    ...cluster.topics,
    ...cluster.entities,
  ]
    .join(" ")
    .toLowerCase();

  const matched: AccessibilityCategory[] = [];

  for (const [category, keywords] of Object.entries(ACCESSIBILITY_KEYWORDS) as [
    AccessibilityCategory,
    string[],
  ][]) {
    if (keywords.some((kw) => matchesKeyword(searchText, kw))) {
      matched.push(category);
    }
  }

  return matched;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreCluster(
  cluster: StoryCluster,
  categories: AccessibilityCategory[],
  now: number,
): number {
  if (categories.length === 0) return 0;

  // Pick the highest-priority category's base score
  const baseScore = Math.max(...categories.map((c) => CATEGORY_BASE_SCORES[c]));

  const isBreaking = cluster.breakingScore >= 70;
  const isOfficial =
    (cluster.classification?.isOfficialAnnouncement ?? false) || cluster.officialSourcePresent;

  const age = now - new Date(cluster.lastPublishedAt).getTime();
  const recencyBonus =
    age <= VELOCITY_WINDOW_24H_MS
      ? ACCESSIBILITY_SCORE_BONUSES.recency24h
      : age <= VELOCITY_WINDOW_72H_MS
        ? ACCESSIBILITY_SCORE_BONUSES.recency72h
        : 0;

  return (
    baseScore +
    (isBreaking ? ACCESSIBILITY_SCORE_BONUSES.breaking : 0) +
    (isOfficial ? ACCESSIBILITY_SCORE_BONUSES.official : 0) +
    (cluster.sourceCount > 1 ? ACCESSIBILITY_SCORE_BONUSES.multiSource : 0) +
    (categories.length > 1 ? ACCESSIBILITY_SCORE_BONUSES.multiCategory : 0) +
    recencyBonus
  );
}

// ── Build AccessibilityStory ──────────────────────────────────────────────────

function toAccessibilityStory(
  cluster: StoryCluster,
  categories: AccessibilityCategory[],
  score: number,
): AccessibilityStory {
  // Primary category = highest-scoring one (first in priority order)
  const categoryPriority: AccessibilityCategory[] = [
    "das",
    "blind_low_vision",
    "mobility",
    "service_animals",
    "captions",
  ];
  const primaryCategory =
    categoryPriority.find((c) => categories.includes(c)) ?? categories[0];

  const isBreaking = cluster.breakingScore >= 70;
  const isOfficial =
    (cluster.classification?.isOfficialAnnouncement ?? false) || cluster.officialSourcePresent;

  const categoryLabels: Record<AccessibilityCategory, string> = {
    das: "Disability Access",
    blind_low_vision: "Blind & Low Vision",
    mobility: "Mobility",
    service_animals: "Service Animals",
    captions: "Captions & Hearing",
  };

  const metaParts: string[] = [categoryLabels[primaryCategory]];
  if (isBreaking) metaParts.push("Breaking");
  if (isOfficial) metaParts.push("Official");
  if (cluster.sourceCount > 1) metaParts.push(`${cluster.sourceCount} sources`);

  return {
    clusterId: cluster.clusterId,
    primaryItemId: cluster.primaryItemId,
    headline: cluster.canonicalTitle,
    summary: cluster.shortSummary || undefined,
    categories,
    primaryCategory,
    score,
    isBreaking,
    isOfficial,
    sourceCount: cluster.sourceCount,
    publishedAt: cluster.lastPublishedAt,
    accessibilityLabel: [cluster.canonicalTitle, ...metaParts].join(". "),
    accessibilityHint: "Double tap to read this accessibility story.",
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function buildAccessibilityHub(input: AccessibilityInput): AccessibilityHub {
  const { clusters, now = new Date() } = input;
  const nowMs = now.getTime();

  const scored: { cluster: StoryCluster; categories: AccessibilityCategory[]; score: number }[] =
    [];

  for (const cluster of clusters) {
    const categories = detectCategories(cluster);
    if (categories.length === 0) continue;
    const score = scoreCluster(cluster, categories, nowMs);
    if (score >= MIN_ACCESSIBILITY_SCORE) {
      scored.push({ cluster, categories, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const stories = scored
    .slice(0, ACCESSIBILITY_HUB_LIMIT)
    .map(({ cluster, categories, score }) => toAccessibilityStory(cluster, categories, score));

  const dasUpdates = scored
    .filter(({ categories }) => categories.includes("das"))
    .slice(0, DAS_UPDATES_LIMIT)
    .map(({ cluster, categories, score }) => toAccessibilityStory(cluster, categories, score));

  return { stories, dasUpdates, computedAt: nowMs };
}
