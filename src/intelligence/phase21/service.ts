import type { StoryCluster } from "../../types/storyTypes";
import { ENTERTAINMENT_CLUSTERS_LIMIT, ENTERTAINMENT_TYPE_KEYWORDS, TYPE_PRIORITY } from "./rules";
import type { EntertainmentCluster, EntertainmentType, ParkEntertainmentHub } from "./types";

export interface EntertainmentHubInput {
  parkTagKey: string;
  clusters: StoryCluster[];
  now?: Date;
}

function detectType(cluster: StoryCluster): EntertainmentType | null {
  const text = cluster.canonicalTitle.toLowerCase();
  const topicText = cluster.topics.join(" ").toLowerCase();
  const combined = `${text} ${topicText}`;
  for (const type of TYPE_PRIORITY) {
    if (ENTERTAINMENT_TYPE_KEYWORDS[type].some((kw) => combined.includes(kw))) return type;
  }
  return null;
}

function clusterIsForPark(cluster: StoryCluster, parkTagKey: string): boolean {
  if (cluster.parks.includes(`park:${parkTagKey}`)) return true;
  if (cluster.parks.some((p) => p.toLowerCase().includes(parkTagKey.replace(/_/g, " ")))) return true;
  return cluster.parks.length === 0;
}

export function buildParkEntertainmentHub(input: EntertainmentHubInput): ParkEntertainmentHub {
  const { parkTagKey, clusters, now = new Date() } = input;

  const matches: EntertainmentCluster[] = [];

  for (const cluster of clusters) {
    if (!clusterIsForPark(cluster, parkTagKey)) continue;
    const entertainmentType = detectType(cluster);
    if (!entertainmentType) continue;

    const entertainmentEntityName = cluster.entities.find((e) => {
      const el = e.toLowerCase();
      return ENTERTAINMENT_TYPE_KEYWORDS[entertainmentType].some((kw) => el.includes(kw.split(" ")[0]));
    });

    matches.push({
      clusterId: cluster.clusterId,
      headline: cluster.canonicalTitle,
      publishedAt: cluster.lastPublishedAt,
      sourceCount: cluster.sourceCount,
      isOfficial: cluster.officialSourcePresent,
      isBreaking: cluster.breakingScore > 0,
      entertainmentType,
      entertainmentEntityName,
      accessibilityLabel: `${cluster.canonicalTitle}. ${entertainmentType.replace(/_/g, " ")}.${cluster.officialSourcePresent ? " Official source." : ""}`,
    });
  }

  const sorted = matches
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, ENTERTAINMENT_CLUSTERS_LIMIT);

  const hasSpectacular = sorted.some(
    (c) => c.entertainmentType === "fireworks" || c.entertainmentType === "seasonal_spectacular",
  );

  return {
    parkTagKey,
    clusters: sorted,
    hasSpectacular,
    computedAt: now.getTime(),
  };
}
