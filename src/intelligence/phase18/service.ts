import type { StoryCluster } from "../../types/storyTypes";
import destinationsData from "../../data/phase18/destinations.json";
import type { DestinationProfile, DestinationProfileResult } from "./types";

const DESTINATION_PROFILES: DestinationProfile[] = destinationsData as DestinationProfile[];

const RECENT_CLUSTER_LIMIT = 6;

function clusterMatchesDestination(cluster: StoryCluster, profile: DestinationProfile): boolean {
  const entitySet = new Set(profile.entityNames.map((n) => n.toLowerCase()));
  // Check entity overlap
  if (cluster.entities.some((e) => entitySet.has(e.toLowerCase()))) return true;
  // Check park tag
  if (profile.parkTagKey && cluster.parks.includes(`park:${profile.parkTagKey}`)) return true;
  // Check parks array (some clusters store the short park key)
  if (profile.parkTagKey && cluster.parks.some((p) => p.toLowerCase().includes(profile.parkTagKey!.replace(/_/g, " ")))) return true;
  return false;
}

export function getDestinationProfile(
  parkTagKey: string,
  clusters: StoryCluster[],
): DestinationProfileResult | null {
  const profile = DESTINATION_PROFILES.find((p) => p.parkTagKey === parkTagKey);
  if (!profile) return null;

  const matching = clusters.filter((c) => clusterMatchesDestination(c, profile));
  const sorted = [...matching].sort(
    (a, b) => new Date(b.lastPublishedAt).getTime() - new Date(a.lastPublishedAt).getTime(),
  );

  // Collect related entity names seen in matching clusters (beyond the profile's own entity names)
  const profileEntitySet = new Set(profile.entityNames.map((n) => n.toLowerCase()));
  const relatedEntitySet = new Set<string>();
  for (const c of matching) {
    for (const e of c.entities) {
      if (!profileEntitySet.has(e.toLowerCase())) {
        relatedEntitySet.add(e);
      }
    }
  }

  return {
    profile,
    clusterCount: matching.length,
    recentClusterIds: sorted.slice(0, RECENT_CLUSTER_LIMIT).map((c) => c.clusterId),
    relatedEntityNames: [...relatedEntitySet].slice(0, 8),
  };
}

export function getAllDestinationProfiles(): DestinationProfile[] {
  return DESTINATION_PROFILES;
}
