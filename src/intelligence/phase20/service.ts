import type { StoryCluster } from "../../types/storyTypes";
import {
  DINING_CLUSTERS_LIMIT,
  DINING_ENTITY_KEYWORDS,
  DINING_KEYWORDS,
  TOP_DINING_ENTITIES_LIMIT,
} from "./rules";
import type { DiningCluster, ParkDiningIntelligence } from "./types";

export interface DiningIntelligenceInput {
  parkTagKey: string;
  clusters: StoryCluster[];
  now?: Date;
}

function isDiningCluster(cluster: StoryCluster): boolean {
  const text = cluster.canonicalTitle.toLowerCase();
  if (DINING_KEYWORDS.some((kw) => text.includes(kw))) return true;
  if (cluster.topics.some((t) => DINING_KEYWORDS.some((kw) => t.toLowerCase().includes(kw)))) return true;
  return false;
}

function findDiningEntity(cluster: StoryCluster): string | undefined {
  return cluster.entities.find((e) =>
    DINING_ENTITY_KEYWORDS.some((kw) => e.toLowerCase().includes(kw)),
  );
}

function clusterIsForPark(cluster: StoryCluster, parkTagKey: string): boolean {
  if (cluster.parks.some((p) => p.toLowerCase().includes(parkTagKey.replace(/_/g, " ")))) return true;
  if (cluster.parks.includes(`park:${parkTagKey}`)) return true;
  // Broad check: no park filter if cluster.parks is empty (relevant globally)
  if (cluster.parks.length === 0) return true;
  return false;
}

export function buildParkDiningIntelligence(
  input: DiningIntelligenceInput,
): ParkDiningIntelligence {
  const { parkTagKey, clusters, now = new Date() } = input;

  const filtered = clusters
    .filter((c) => clusterIsForPark(c, parkTagKey) && isDiningCluster(c))
    .sort((a, b) => new Date(b.lastPublishedAt).getTime() - new Date(a.lastPublishedAt).getTime())
    .slice(0, DINING_CLUSTERS_LIMIT);

  const entityCounts = new Map<string, number>();
  const diningClusters: DiningCluster[] = filtered.map((c) => {
    const diningEntity = findDiningEntity(c);
    if (diningEntity) entityCounts.set(diningEntity, (entityCounts.get(diningEntity) ?? 0) + 1);

    const relLabel = c.sourceCount > 1 ? `, ${c.sourceCount} sources` : "";
    return {
      clusterId: c.clusterId,
      headline: c.canonicalTitle,
      publishedAt: c.lastPublishedAt,
      sourceCount: c.sourceCount,
      isOfficial: c.officialSourcePresent,
      diningEntityName: diningEntity,
      accessibilityLabel: `${c.canonicalTitle}${c.officialSourcePresent ? ", official" : ""}${relLabel}.`,
    };
  });

  const topDiningEntities = [...entityCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP_DINING_ENTITIES_LIMIT)
    .map(([name]) => name);

  return {
    parkTagKey,
    diningClusters,
    topDiningEntities,
    computedAt: now.getTime(),
  };
}
