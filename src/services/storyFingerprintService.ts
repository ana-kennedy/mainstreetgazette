import type { ContentItem, StoryFingerprint } from "../types/storyTypes";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "at", "with",
  "new", "breaking", "just", "officially", "disney",
]);

export function normalizeText(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function createStoryFingerprint(item: ContentItem): StoryFingerprint {
  return {
    itemId: item.itemId,
    normalizedTitleTokens: normalizeText(item.title),
    summaryTokens: normalizeText(item.summary ?? ""),
    locations: item.locations ?? [],
    parks: item.parks ?? [],
    entities: item.entities ?? [],
    topics: item.topics ?? [],
    eventActions: item.eventActions ?? [],
    datesMentioned: item.datesMentioned ?? [],
    contentType: item.contentType,
    platform: item.platform,
    sourceId: item.sourceId,
    canonicalUrl: item.canonicalUrl ?? item.url,
    publishedAt: item.publishedAt,
  };
}
