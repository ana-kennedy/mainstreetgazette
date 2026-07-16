import type { ContentItem, StoryCluster, ClusterMatchResult } from "../types/storyTypes";
import { normalizeText } from "./storyFingerprintService";
import { GENERIC_ENTITY_NAMES } from "./knowledgeMatcher";

function intersectionCount(a: string[], b: string[]): number {
  const bSet = new Set(b.map((v) => v.toLowerCase()));
  return a.filter((v) => bSet.has(v.toLowerCase())).length;
}

// Drops "whole resort" entities (Walt Disney World Resort, Disneyland Resort, etc.) before
// comparing — see GENERIC_ENTITY_NAMES for why these don't count as same-story evidence.
function specificEntities(entities: string[]): string[] {
  return entities.filter((e) => !GENERIC_ENTITY_NAMES.has(e));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  const intersection = [...aSet].filter((v) => bSet.has(v)).length;
  const union = new Set([...aSet, ...bSet]).size;
  return intersection / union;
}

function hoursBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

const MAX_CLUSTER_ACTIVITY_GAP_HOURS = 24 * 14; // 2 weeks

export function scoreItemAgainstCluster(item: ContentItem, cluster: StoryCluster): ClusterMatchResult {
  // Group same-story coverage within a content type (multiple articles, multiple videos, etc.)
  // but never merge an article with a video or podcast into one card — different media,
  // different interaction model, shouldn't be bundled just because they cover the same event.
  if (!cluster.contentTypes.includes(item.contentType)) {
    return { clusterId: cluster.clusterId, score: 0, decision: "new_story", reasons: ["different_content_type"] };
  }

  // Podcast episode titles/descriptions share a lot of boilerplate (show name, hosts, sponsor
  // reads), which inflates the title/summary similarity checks below even between completely
  // unrelated episodes — in practice this merged dozens of episodes spanning years into one
  // card. Episodes are their own thing to browse, not "coverage" that needs deduplicating
  // across sources the way articles/videos do, so podcasts never group.
  if (item.contentType === "podcast") {
    return { clusterId: cluster.clusterId, score: 0, decision: "new_story", reasons: ["podcasts_not_grouped"] };
  }

  // Compare against the cluster's primary item ONLY — never the cluster's aggregate
  // entities/parks/topics (a union of every member ever merged in via recalculateCluster).
  // Matching against that union let a cluster's "matchable surface" keep expanding with every
  // merge: video A (Magic Kingdom) joins, cluster now matches Magic Kingdom *and* whatever else
  // A mentioned; video B (Epcot, unrelated to A) then matches the *expanded* cluster on some
  // other shared tag and joins too — chaining unrelated items together transitively. Anchoring
  // to the single primary item means a cluster can only grow by actually resembling the story
  // it started as, not by resembling something a previous, unrelated new member happened to add.
  const primaryItem = cluster.items.find((ci) => ci.itemId === cluster.primaryItemId) ?? cluster.items[0];

  // Hard cap regardless of score: a cluster that's gone quiet for a couple of weeks shouldn't
  // keep absorbing new items just because the primary item's tags are broad ones.
  if (hoursBetween(item.publishedAt, primaryItem.publishedAt) > MAX_CLUSTER_ACTIVITY_GAP_HOURS) {
    return { clusterId: cluster.clusterId, score: 0, decision: "new_story", reasons: ["cluster_gone_stale"] };
  }

  let score = 0;
  const reasons: string[] = [];

  if (intersectionCount(specificEntities(item.entities), specificEntities(primaryItem.entities)) > 0) {
    score += 35;
    reasons.push("same_primary_disney_entity");
  }

  if (intersectionCount(item.parks, primaryItem.parks) > 0) {
    score += 20;
    reasons.push("same_park");
  }

  if (intersectionCount(item.locations, primaryItem.locations) > 0) {
    score += 15;
    reasons.push("same_location");
  }

  if (intersectionCount(item.topics, primaryItem.topics) > 0) {
    score += 20;
    reasons.push("same_topic_type");
  }

  if (intersectionCount(item.eventActions ?? [], primaryItem.eventActions ?? []) > 0) {
    score += 25;
    reasons.push("same_event_action");
  }

  const hoursFromCluster = hoursBetween(item.publishedAt, primaryItem.publishedAt);
  if (hoursFromCluster <= 24) {
    score += 15;
    reasons.push("published_within_24_hours");
  } else if (hoursFromCluster <= 72) {
    score += 10;
    reasons.push("published_within_72_hours");
  }

  const titleSimilarity = jaccard(normalizeText(item.title), normalizeText(primaryItem.title));
  if (titleSimilarity >= 0.5) {
    score += 15;
    reasons.push("high_title_similarity");
  } else if (titleSimilarity >= 0.3) {
    score += 8;
    reasons.push("medium_title_similarity");
  }

  if (item.summary && primaryItem.summary) {
    const summarySimilarity = jaccard(normalizeText(item.summary), normalizeText(primaryItem.summary));
    if (summarySimilarity >= 0.5) {
      score += 20;
      reasons.push("high_summary_similarity");
    } else if (summarySimilarity >= 0.3) {
      score += 10;
      reasons.push("medium_summary_similarity");
    }
  }

  if (intersectionCount(item.datesMentioned ?? [], primaryItem.datesMentioned ?? []) > 0) {
    score += 15;
    reasons.push("same_date_mentioned");
  }

  // Entity + park + topic + same-day overlap alone can add up to 70+ points without the
  // items actually being about the same thing — e.g. two unrelated Magic Kingdom attraction
  // stories on the same day. Require some real content-level evidence (title/summary overlap,
  // a shared specific event, or a shared specific date) before allowing an actual merge;
  // otherwise cap at "related_topic", which doesn't collapse cards in the feed.
  const hasContentEvidence = reasons.some((r) =>
    [
      "high_title_similarity",
      "medium_title_similarity",
      "high_summary_similarity",
      "medium_summary_similarity",
      "same_event_action",
      "same_date_mentioned",
    ].includes(r)
  );

  let decision: ClusterMatchResult["decision"];
  if (score >= 85 && hasContentEvidence) decision = "same_story";
  else if (score >= 70 && hasContentEvidence) decision = "related_coverage";
  else if (score >= 55) decision = "related_topic";
  else decision = "new_story";

  return { clusterId: cluster.clusterId, score, decision, reasons };
}
