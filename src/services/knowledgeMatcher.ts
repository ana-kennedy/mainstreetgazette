import entitiesJson from "../assets/data/knowledge/disney_entities_v1.json";
import topicsJson from "../assets/data/knowledge/topic_taxonomy_v1.json";
import type { DisneyKnowledgeEntity, EntityMatch, TopicMatch, TopicTaxonomyItem } from "../domain/models";

const entities = (entitiesJson as { entities: DisneyKnowledgeEntity[] }).entities;
const topics = (topicsJson as { topics: TopicTaxonomyItem[] }).topics;

// International location IDs — grouped under the "international" filter chip
export const INTERNATIONAL_LOCATION_IDS = new Set(["dlp", "tdr", "hkdl", "shdr", "aulani", "abd"]);

// "Resort umbrella" entities (Walt Disney World Resort, Disneyland Resort, etc. — the whole
// multi-park complex, as opposed to a specific park like EPCOT or a specific attraction) show
// up in almost every piece of content from a source that covers that resort, so sharing one
// isn't meaningful evidence that two items are about the same story. Story-clustering excludes
// these from entity-overlap scoring; matched entity display elsewhere is unaffected.
export const GENERIC_ENTITY_NAMES = new Set(
  entities.filter((e) => e.id.endsWith("_resort_umbrella")).map((e) => e.name)
);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// How many words away "disney" is allowed to be from a bare single-word keyword occurrence
// for it to still count as a real mention (see hasNearbyWord below).
const DISNEY_PROXIMITY_WINDOW = 4;

// True if `target` appears as a whole word in `words`, with `near` also appearing as a whole
// word within `window` words of at least one of those occurrences.
function hasNearbyWord(words: string[], target: string, near: string, window: number): boolean {
  for (let i = 0; i < words.length; i++) {
    if (words[i] !== target) continue;
    const start = Math.max(0, i - window);
    const end = Math.min(words.length, i + window + 1);
    if (words.slice(start, end).includes(near)) return true;
  }
  return false;
}

export function matchDisneyEntities(title: string, summary = "", maxResults = 8): EntityMatch[] {
  const normalized = `${normalizeText(title)} ${normalizeText(summary)}`;
  const text = ` ${normalized} `;
  const words = normalized.split(" ").filter(Boolean);
  const matches: EntityMatch[] = [];

  for (const entity of entities) {
    const matchedKeywords: string[] = [];
    let score = 0;
    for (const keyword of entity.keywords) {
      const nk = normalizeText(keyword);
      if (!nk || nk.length < 3) continue;
      const isSingleWord = !nk.includes(" ");
      if (isSingleWord) {
        // Bare single-word keywords (e.g. "Dream", "Magic", "Adventure" for the cruise ships)
        // are common English words that show up constantly in unrelated titles/descriptions —
        // only trust one as an entity mention when "Disney" also appears nearby, not just
        // anywhere in the same text.
        if (!hasNearbyWord(words, nk, "disney", DISNEY_PROXIMITY_WINDOW)) continue;
        matchedKeywords.push(keyword);
        score += 8;
      } else if (text.includes(` ${nk} `)) {
        matchedKeywords.push(keyword);
        score += 18;
      }
    }
    if (entity.confidenceBoost === "high") score += 5;
    if (matchedKeywords.length > 0) {
      matches.push({
        entityId: entity.id,
        entityName: entity.name,
        score,
        matchedKeywords,
        locationId: entity.locationId,
        parkId: entity.parkId,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

export function classifyTopic(title: string, summary = ""): TopicMatch[] {
  const text = ` ${normalizeText(title)} ${normalizeText(summary)} `;
  return topics
    .map((topic) => ({
      topicId: topic.id,
      topicName: topic.name,
      score: topic.keywords.reduce(
        (sum, keyword) => sum + (text.includes(normalizeText(keyword)) ? 10 : 0),
        0
      ),
    }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function buildStoryFingerprint(input: {
  title: string;
  summary?: string;
  publishedAt?: string;
}): string {
  const entityMatches = matchDisneyEntities(input.title, input.summary ?? "", 5);
  const topicMatches = classifyTopic(input.title, input.summary ?? "");
  const topEntityIds = entityMatches
    .slice(0, 3)
    .map((m) => m.entityId)
    .sort()
    .join("+");
  const topTopic = topicMatches[0]?.topicId ?? "general";
  const dateBucket = input.publishedAt ? input.publishedAt.slice(0, 10) : "unknown-date";
  return `${topEntityIds || "no-entity"}::${topTopic}::${dateBucket}`;
}
