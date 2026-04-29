import type { FeedItem, StoryGroup, TrustLabel } from "../domain/models";
import { stableHash } from "./formatting";

function tokenSet(title: string): Set<string> {
  const normalized = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  return new Set(normalized.split(" ").filter(Boolean));
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

export function groupFeedItems(items: FeedItem[], similarityThreshold = 0.6): { items: FeedItem[]; groups: StoryGroup[] } {
  const groupedItems = items.map((item) => ({ ...item }));
  const groupableItems = items.filter((item) => item.contentType === "article");
  const groups: StoryGroup[] = [];
  const consumed = new Set<string>();

  for (const item of groupableItems) {
    if (consumed.has(item.id)) continue;
    const members = [item];
    consumed.add(item.id);

    for (const candidate of groupableItems) {
      if (candidate.id === item.id || consumed.has(candidate.id)) continue;
      const exactURLMatch = item.canonicalURL.toLowerCase() === candidate.canonicalURL.toLowerCase();
      if (exactURLMatch || jaccardSimilarity(item.title, candidate.title) >= similarityThreshold) {
        members.push(candidate);
        consumed.add(candidate.id);
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
    groups.push({
      id: groupID,
      primaryItemID: primary.id,
      memberItemIDs: members.map((member) => member.id),
      headline: primary.title,
      sourceCount: members.length,
      contentTypes: [...new Set(members.map((member) => member.contentType))],
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
