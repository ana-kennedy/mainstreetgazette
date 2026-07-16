// Phase 78 — Content Quality & Maintenance: rules for filtering low-quality feed items.
import type { FeedItem } from "../domain/models";

export type QualityViolation =
  | "titleTooShort"
  | "titleTooLong"
  | "clickbait"
  | "duplicateCanonicalURL"
  | "missingPublishedDate"
  | "tooOld"
  | "emptyTitle";

export interface QualityResult {
  itemId: string;
  passed: boolean;
  violations: QualityViolation[];
}

const CLICKBAIT_PATTERNS = [
  /you won't believe/i,
  /this one (weird|simple) trick/i,
  /what happens next/i,
  /\bshocking\b/i,
];

const MAX_AGE_DAYS = 90;

export function assessItemQuality(item: FeedItem, seenURLs?: Set<string>): QualityResult {
  const violations: QualityViolation[] = [];

  if (!item.title || item.title.trim().length === 0) {
    violations.push("emptyTitle");
  } else {
    if (item.title.trim().length < 10) violations.push("titleTooShort");
    if (item.title.length > 300) violations.push("titleTooLong");
    if (CLICKBAIT_PATTERNS.some((p) => p.test(item.title))) violations.push("clickbait");
  }

  if (!item.publishedAt) {
    violations.push("missingPublishedDate");
  } else {
    const ageMs = Date.now() - new Date(item.publishedAt).getTime();
    if (ageMs > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) violations.push("tooOld");
  }

  if (seenURLs && item.canonicalURL) {
    if (seenURLs.has(item.canonicalURL)) {
      violations.push("duplicateCanonicalURL");
    } else {
      seenURLs.add(item.canonicalURL);
    }
  }

  return { itemId: item.id, passed: violations.length === 0, violations };
}

export function filterHighQualityItems(items: FeedItem[]): FeedItem[] {
  const seenURLs = new Set<string>();
  return items.filter((item) => {
    const result = assessItemQuality(item, seenURLs);
    return result.passed || !result.violations.includes("duplicateCanonicalURL");
  });
}

export function qualitySummary(results: QualityResult[]): {
  total: number;
  passed: number;
  failed: number;
  topViolation: QualityViolation | null;
} {
  const passed = results.filter((r) => r.passed).length;
  const violationCounts: Partial<Record<QualityViolation, number>> = {};
  for (const r of results) {
    for (const v of r.violations) {
      violationCounts[v] = (violationCounts[v] ?? 0) + 1;
    }
  }
  const topViolation = (Object.entries(violationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as QualityViolation) ?? null;
  return { total: results.length, passed, failed: results.length - passed, topViolation };
}
