import type { FeedItem } from "../domain/models";

export interface EditorsNoteResult {
  text: string;
  itemCount: number;
  signature: string;
}

const GENERIC_TOPICS = new Set(["news", "disney", "parks", "official"]);

function mostCommonLabels(items: FeedItem[], limit = 2): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const labels = [
      ...(item.entityMatches ?? []).map((match) => match.entityName),
      ...(item.topicMatches ?? []).map((match) => match.topicName),
    ];
    for (const raw of labels) {
      const label = raw.trim();
      if (!label || GENERIC_TOPICS.has(label.toLowerCase())) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label);
}

function mediaPhrase(items: FeedItem[]): string | null {
  const types = new Set(items.map((item) => item.contentType));
  if (types.has("podcast") && types.has("video")) return "plus new podcasts and videos";
  if (types.has("podcast")) return "along with a new podcast episode";
  if (types.has("video")) return "along with new video coverage";
  if (types.has("community")) return "and conversation from the Disney community";
  return null;
}

export function buildEditorsNote(eligibleItems: FeedItem[]): EditorsNoteResult | null {
  if (eligibleItems.length < 3) return null;

  const sorted = [...eligibleItems].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const labels = mostCommonLabels(sorted);
  const media = mediaPhrase(sorted);

  let middle = "a fresh mix of Disney stories";
  if (labels.length === 1) middle = `updates connected with ${labels[0]}`;
  if (labels.length === 2) middle = `updates from ${labels[0]} and ${labels[1]}`;
  if (media) middle += `, ${media}`;

  const text = `Today's Gazette brings together ${middle}. Take your time and enjoy today's edition.`;
  const signature = sorted.map((item) => item.id).sort().join("|");
  return { text, itemCount: sorted.length, signature };
}
