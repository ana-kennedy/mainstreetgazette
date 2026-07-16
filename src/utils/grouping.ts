import type { ContentType, FeedItem, StoryGroup, TrustLabel } from "../domain/models";
import { stableHash } from "./formatting";

function tokenSet(title: string): Set<string> {
  // Strip common stop words that inflate similarity scores
  const STOP = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "are", "was", "were", "be", "been", "as", "its", "at", "by"]);
  const normalized = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  return new Set(normalized.split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
}

function jaccardSimilarity(lhs: string, rhs: string): number {
  const a = tokenSet(lhs);
  const b = tokenSet(rhs);
  if (a.size === 0 && b.size === 0) return 1;
  const union = new Set([...a, ...b]);
  const intersection = [...a].filter((value) => b.has(value));
  return union.size > 0 ? intersection.length / union.size : 0;
}

function trustPriority(label?: TrustLabel | null): number {
  if (label === "official") return 3;
  if (label === "verifiedNews") return 2;
  if (label === "communitySource") return 1;
  return 0;
}

function withinTimeWindow(a: string, b: string, hoursWindow = 72): boolean {
  const diffMs = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return diffMs <= hoursWindow * 60 * 60 * 1000;
}

// Community items (Reddit) are never the anchor for a group — they can join article groups
// as related coverage but shouldn't anchor a story cluster.
function isGroupableAnchor(item: FeedItem): boolean {
  return item.contentType === "article";
}

// Videos and podcasts can be related coverage but shouldn't be auto-merged with an article
// unless the similarity is very high. Community posts join at a lower threshold.
function similarityThresholdForPair(anchor: FeedItem, candidate: FeedItem): number {
  if (anchor.sourceID === candidate.sourceID) return 1.1; // same source → never group
  if (candidate.contentType === "community") return 0.72;
  if (candidate.contentType === "video" || candidate.contentType === "podcast") return 0.68;
  return 0.60; // article-to-article
}

// Two items with matching fingerprints (same top entities + topic + same day) are likely
// the same story even if their headlines are phrased differently.
function fingerprintsMatch(a: FeedItem, b: FeedItem): boolean {
  const fpA = a.storyFingerprint;
  const fpB = b.storyFingerprint;
  if (!fpA || !fpB) return false;
  if (fpA.startsWith("no-entity::") || fpB.startsWith("no-entity::")) return false;
  return fpA === fpB;
}

export function groupFeedItems(items: FeedItem[]): { items: FeedItem[]; groups: StoryGroup[] } {
  const groupedItems = items.map((item) => ({ ...item }));
  const groups: StoryGroup[] = [];
  const consumed = new Set<string>();

  // Only article items can anchor a story cluster
  const anchorItems = items.filter(isGroupableAnchor);

  // All items except community-only are candidates to join a cluster
  const candidateItems = items.filter((item) => item.contentType !== "community");

  for (const anchor of anchorItems) {
    if (consumed.has(anchor.id)) continue;
    const members: FeedItem[] = [anchor];
    consumed.add(anchor.id);

    // Phase 1: find other articles covering the same story
    // Match by: exact URL, Jaccard title similarity, OR matching storyFingerprint (entity+topic+date)
    for (const candidate of candidateItems) {
      if (candidate.id === anchor.id || consumed.has(candidate.id)) continue;
      if (!withinTimeWindow(anchor.publishedAt, candidate.publishedAt)) continue;
      const threshold = similarityThresholdForPair(anchor, candidate);
      const exactURLMatch = anchor.canonicalURL.toLowerCase() === candidate.canonicalURL.toLowerCase();
      if (
        exactURLMatch ||
        jaccardSimilarity(anchor.title, candidate.title) >= threshold ||
        fingerprintsMatch(anchor, candidate)
      ) {
        members.push(candidate);
        consumed.add(candidate.id);
      }
    }

    // Phase 2: attach community discussion if 2+ article sources already grouped
    if (members.length >= 2) {
      const communityItems = items.filter((item) => item.contentType === "community" && !consumed.has(item.id));
      for (const community of communityItems) {
        if (!withinTimeWindow(anchor.publishedAt, community.publishedAt, 96)) continue;
        if (jaccardSimilarity(anchor.title, community.title) >= 0.45) {
          members.push(community);
          consumed.add(community.id);
        }
      }
    }

    if (members.length < 2) continue;

    const primary = [...members].sort((lhs, rhs) => {
      const priorityDifference = trustPriority(rhs.trustLabel) - trustPriority(lhs.trustLabel);
      if (priorityDifference !== 0) return priorityDifference;
      return new Date(rhs.publishedAt).getTime() - new Date(lhs.publishedAt).getTime();
    })[0];

    const now = new Date().toISOString();
    const groupID = stableHash(members.map((member) => member.id).join("|"));
    const contentTypes = [...new Set(members.map((m) => m.contentType))] as ContentType[];

    groups.push({
      id: groupID,
      primaryItemID: primary.id,
      memberItemIDs: members.map((member) => member.id),
      headline: primary.title,
      sourceCount: new Set(members.map((m) => m.sourceID)).size,
      contentTypes,
      createdAt: now,
      updatedAt: now
    });

    for (const member of members) {
      const index = groupedItems.findIndex((candidate) => candidate.id === member.id);
      if (index >= 0) groupedItems[index].groupID = groupID;
    }
  }

  return { items: groupedItems, groups };
}
