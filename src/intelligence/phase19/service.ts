import type { StoryCluster } from "../../types/storyTypes";
import type {
  AttractionIntelligence,
  AttractionIntelligenceMap,
  AttractionStatus,
} from "./types";

export interface AttractionEntry {
  id: string;
  name: string;
  status: string;
}

export interface AttractionIntelligenceInput {
  attractions: AttractionEntry[];
  clusters: StoryCluster[];
  now?: Date;
}

function resolveStatus(raw: string): AttractionStatus {
  const s = raw.toUpperCase();
  if (s === "REFURBISHMENT") return "refurbishment";
  if (s === "CLOSED") return "closed";
  if (s === "DOWN") return "down";
  if (s === "OPERATING") return "operating";
  return "unknown";
}

function nameMatchesCluster(attractionName: string, cluster: StoryCluster): boolean {
  const lowerName = attractionName.toLowerCase();
  // Check entity list first (most precise)
  if (cluster.entities.some((e) => e.toLowerCase() === lowerName)) return true;
  // Partial match: attraction name contained in cluster title
  if (cluster.canonicalTitle.toLowerCase().includes(lowerName)) return true;
  // Cluster entity partially matches attraction name (≥4 chars overlap)
  if (
    lowerName.length >= 5 &&
    cluster.entities.some(
      (e) =>
        e.toLowerCase().includes(lowerName) ||
        lowerName.includes(e.toLowerCase()),
    )
  )
    return true;
  return false;
}

export function buildAttractionIntelligence(
  input: AttractionIntelligenceInput,
): AttractionIntelligenceMap {
  const { attractions, clusters, now = new Date() } = input;
  const byAttractionName = new Map<string, AttractionIntelligence>();
  const attractionsWithNews: string[] = [];
  const refurbishmentAlerts: string[] = [];

  for (const attr of attractions) {
    const status = resolveStatus(attr.status);
    const related = clusters.filter((c) => nameMatchesCluster(attr.name, c));
    const hasNewsAlert = related.length > 0;
    const topCluster = related[0];

    const intel: AttractionIntelligence = {
      attractionId: attr.id,
      attractionName: attr.name,
      status,
      relatedClusterIds: related.map((c) => c.clusterId),
      hasNewsAlert,
      newsAlertHeadline: topCluster?.canonicalTitle,
      accessibilityLabel: hasNewsAlert
        ? `${attr.name}: ${related.length} related ${related.length === 1 ? "story" : "stories"}.`
        : `${attr.name}: no related news.`,
    };

    byAttractionName.set(attr.name, intel);
    if (hasNewsAlert) attractionsWithNews.push(attr.name);
    if (status === "refurbishment") refurbishmentAlerts.push(attr.name);
  }

  return {
    byAttractionName,
    attractionsWithNews,
    refurbishmentAlerts,
    computedAt: (now ?? new Date()).getTime(),
  };
}
