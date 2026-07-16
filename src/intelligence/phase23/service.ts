import type { StoryCluster } from "../../types/storyTypes";
import type {
  AccessibilityNewsItem,
  AccessibilityTopicType,
  ParkAccessibilityIntelligence,
} from "./types";

const TOPIC_KEYWORDS: Record<AccessibilityTopicType, string[]> = {
  das: ["das", "disability access service", "accessibility pass", "disability pass"],
  mobility: ["wheelchair", "mobility", "scooter", "ecv", "accessible entrance"],
  visual: ["visual", "braille", "audio description", "low vision", "blind"],
  hearing: ["hearing", "asl", "sign language", "captioning", "caption", "deaf"],
  service_animals: ["service animal", "service dog", "relief area"],
  sensory: ["sensory", "quiet", "autism", "neurodivergent", "overstimulation"],
  general: ["accessibility", "ada", "accommodation", "inclusive", "disability"],
};

const TOPIC_PRIORITY: AccessibilityTopicType[] = [
  "das",
  "mobility",
  "visual",
  "hearing",
  "service_animals",
  "sensory",
  "general",
];

const ITEMS_LIMIT = 5;

function detectTopic(cluster: StoryCluster): AccessibilityTopicType | null {
  const text = `${cluster.canonicalTitle} ${cluster.topics.join(" ")}`.toLowerCase();
  for (const topic of TOPIC_PRIORITY) {
    if (TOPIC_KEYWORDS[topic].some((kw) => text.includes(kw))) return topic;
  }
  return null;
}

function clusterIsForPark(cluster: StoryCluster, parkTagKey: string): boolean {
  if (cluster.parks.includes(`park:${parkTagKey}`)) return true;
  if (cluster.parks.some((p) => p.toLowerCase().includes(parkTagKey.replace(/_/g, " ")))) return true;
  return cluster.parks.length === 0;
}

export interface AccessibilityExplorerInput {
  parkTagKey: string;
  clusters: StoryCluster[];
  now?: Date;
}

export function buildParkAccessibilityIntelligence(
  input: AccessibilityExplorerInput,
): ParkAccessibilityIntelligence {
  const { parkTagKey, clusters, now = new Date() } = input;
  const items: AccessibilityNewsItem[] = [];

  const parkClusters = clusters
    .filter((c) => clusterIsForPark(c, parkTagKey))
    .sort((a, b) => new Date(b.lastPublishedAt).getTime() - new Date(a.lastPublishedAt).getTime());

  for (const cluster of parkClusters) {
    if (items.length >= ITEMS_LIMIT) break;
    const topic = detectTopic(cluster);
    if (!topic) continue;

    items.push({
      clusterId: cluster.clusterId,
      headline: cluster.canonicalTitle,
      publishedAt: cluster.lastPublishedAt,
      isOfficial: cluster.officialSourcePresent,
      topic,
      accessibilityLabel: `${cluster.canonicalTitle}. Topic: ${topic.replace(/_/g, " ")}.${cluster.officialSourcePresent ? " Official source." : ""}`,
    });
  }

  const hasDasUpdate = items.some((i) => i.topic === "das");

  return {
    parkTagKey,
    items,
    hasDasUpdate,
    computedAt: now.getTime(),
  };
}
