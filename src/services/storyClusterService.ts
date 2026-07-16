import type { ContentItem, StoryCluster, ClusteredItem, ClusterRole, ClusterMatchResult, TimelineBucket, StoryContentType } from "../types/storyTypes";
import { scoreItemAgainstCluster } from "./storyScoringService";
import { isExactUrlDuplicate, isSameSourceSocialRepost } from "./storyDeduplicationService";
import { classifyStoryClusterByRules } from "./classification/storyClusterClassifier";

function nowIso(): string {
  return new Date().toISOString();
}

function createClusterId(item: ContentItem): string {
  const date = item.publishedAt.slice(0, 10).replace(/-/g, "");
  const entity = (item.entities[0] ?? item.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 50);
  return `story_${date}_${entity}_${item.itemId.slice(-8)}`;
}

function getTimelineBucket(publishedAt: string): TimelineBucket {
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 36e5;
  if (hours <= 3) return "now";
  if (hours <= 24) return "today";
  if (hours <= 48) return "yesterday";
  if (hours <= 72) return "last3days";
  if (hours <= 24 * 7) return "thisweek";
  if (hours <= 24 * 31) return "thismonth";
  return "all";
}

function roleForItem(item: ContentItem, isPrimary = false): ClusterRole {
  if (isPrimary) return "primary";
  if (item.contentType === "video") return "related_video";
  if (item.contentType === "podcast") return "related_podcast";
  if (item.contentType === "community" || item.contentType === "forum") return "community_discussion";
  return "related_article";
}

function toClusteredItem(
  item: ContentItem,
  role: ClusterRole,
  confidenceScore: number,
  reasons: string[] = []
): ClusteredItem {
  return {
    ...item,
    clusterRole: role,
    confidenceScore,
    isCanonical: role === "primary",
    isHiddenDuplicate: role === "duplicate_social_reference",
    clusteringReasons: reasons,
  };
}

function recalculateCluster(cluster: StoryCluster): StoryCluster {
  const visibleItems = cluster.items.filter((item) => !item.isHiddenDuplicate);
  const sourceCount = new Set(visibleItems.map((item) => item.sourceId)).size;
  const contentTypes = Array.from(new Set(visibleItems.map((item) => item.contentType))) as StoryContentType[];
  const dates = visibleItems.map((item) => new Date(item.publishedAt).getTime());

  const updated: StoryCluster = {
    ...cluster,
    updatedAt: nowIso(),
    lastPublishedAt: new Date(Math.max(...dates)).toISOString(),
    firstPublishedAt: new Date(Math.min(...dates)).toISOString(),
    locations: Array.from(new Set(visibleItems.flatMap((item) => item.locations))),
    parks: Array.from(new Set(visibleItems.flatMap((item) => item.parks))),
    entities: Array.from(new Set(visibleItems.flatMap((item) => item.entities))),
    topics: Array.from(new Set(visibleItems.flatMap((item) => item.topics))),
    contentTypes,
    sourceCount,
    articleCount: visibleItems.filter((item) => item.contentType === "article").length,
    videoCount: visibleItems.filter((item) => item.contentType === "video").length,
    podcastCount: visibleItems.filter((item) => item.contentType === "podcast").length,
    communityCount: visibleItems.filter(
      (item) => item.contentType === "community" || item.contentType === "forum"
    ).length,
    officialSourcePresent: visibleItems.some((item) => (item.sourceTrustScore ?? 0) >= 90),
    confidenceScore: Math.round(
      visibleItems.reduce((sum, item) => sum + item.confidenceScore, 0) /
        Math.max(visibleItems.length, 1)
    ),
    timelineBucket: getTimelineBucket(new Date(Math.max(...dates)).toISOString()),
  };
  return { ...updated, classification: classifyStoryClusterByRules(updated) };
}

export function createNewStoryCluster(item: ContentItem): StoryCluster {
  const clusteredItem = toClusteredItem(item, "primary", 100, ["created_new_cluster"]);
  const cluster: StoryCluster = {
    clusterId: createClusterId(item),
    canonicalTitle: item.title,
    shortSummary: item.summary ?? item.title,
    primaryItemId: item.itemId,
    primarySourceId: item.sourceId,
    status: "new",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    firstPublishedAt: item.publishedAt,
    lastPublishedAt: item.publishedAt,
    locations: item.locations,
    parks: item.parks,
    entities: item.entities,
    topics: item.topics,
    contentTypes: [item.contentType],
    items: [clusteredItem],
    sourceCount: 1,
    articleCount: item.contentType === "article" ? 1 : 0,
    videoCount: item.contentType === "video" ? 1 : 0,
    podcastCount: item.contentType === "podcast" ? 1 : 0,
    communityCount: item.contentType === "community" || item.contentType === "forum" ? 1 : 0,
    officialSourcePresent: (item.sourceTrustScore ?? 0) >= 90,
    breakingScore: item.classification?.breakingScore ?? 0,
    confidenceScore: 100,
    timelineBucket: getTimelineBucket(item.publishedAt),
  };
  return { ...cluster, classification: classifyStoryClusterByRules(cluster) };
}

export function addItemToCluster(
  item: ContentItem,
  cluster: StoryCluster,
  confidenceScore: number,
  reasons: string[],
  decision: ClusterMatchResult["decision"] = "related_coverage"
): StoryCluster {
  const exactDuplicateOf = isExactUrlDuplicate(item, cluster);
  if (exactDuplicateOf) {
    const duplicate = toClusteredItem(item, "duplicate_social_reference", 100, ["exact_url_duplicate"]);
    duplicate.isHiddenDuplicate = true;
    duplicate.duplicateOfItemId = exactDuplicateOf;
    return recalculateCluster({ ...cluster, items: [...cluster.items, duplicate], status: "updated" });
  }

  const socialDuplicateOf = isSameSourceSocialRepost(item, cluster);
  if (socialDuplicateOf) {
    const duplicate = toClusteredItem(item, "duplicate_social_reference", confidenceScore, [
      "same_source_social_repost",
    ]);
    duplicate.isHiddenDuplicate = true;
    duplicate.duplicateOfItemId = socialDuplicateOf;
    return recalculateCluster({ ...cluster, items: [...cluster.items, duplicate], status: "updated" });
  }

  // The card shown in the feed is whichever item holds the "primary" role — without this,
  // it's permanently whichever article started the cluster, even after weeks of newer coverage
  // pile up invisibly underneath it. Only a high-confidence "same_story" match (not the looser
  // "related_coverage" tier, which can be a different angle or a tangential source) is trusted
  // to take over the headline, and only if it's actually newer than the current primary.
  const currentPrimary = cluster.items.find((ci) => ci.itemId === cluster.primaryItemId);
  const isNewer =
    !currentPrimary || new Date(item.publishedAt).getTime() > new Date(currentPrimary.publishedAt).getTime();
  const shouldPromote = decision === "same_story" && isNewer;

  if (shouldPromote) {
    const demoted = cluster.items.map((ci) =>
      ci.itemId === cluster.primaryItemId ? { ...ci, clusterRole: roleForItem(ci), isCanonical: false } : ci
    );
    const newPrimary = toClusteredItem(item, "primary", confidenceScore, reasons);
    return recalculateCluster({
      ...cluster,
      items: [...demoted, newPrimary],
      primaryItemId: item.itemId,
      primarySourceId: item.sourceId,
      canonicalTitle: item.title,
      shortSummary: item.summary ?? item.title,
      status: "updated",
    });
  }

  const related = toClusteredItem(item, roleForItem(item), confidenceScore, reasons);
  return recalculateCluster({ ...cluster, items: [...cluster.items, related], status: "updated" });
}

export function clusterContentItems(
  items: ContentItem[],
  existingClusters: StoryCluster[] = []
): StoryCluster[] {
  let clusters = [...existingClusters];

  const sortedItems = [...items].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  for (const item of sortedItems) {
    // Exact-URL duplicates (e.g. a Reddit post linking straight to an already-seen article)
    // get hidden under that item regardless of content type — this is deduplication, not
    // the cross-type "full coverage" bundling that scoreItemAgainstCluster now excludes.
    const exactDuplicateCluster = clusters.find((cluster) => isExactUrlDuplicate(item, cluster));
    if (exactDuplicateCluster) {
      clusters = clusters.map((cluster) =>
        cluster.clusterId === exactDuplicateCluster.clusterId
          ? addItemToCluster(item, cluster, 100, ["exact_url_duplicate"])
          : cluster
      );
      continue;
    }

    const matches = clusters
      .map((cluster) => scoreItemAgainstCluster(item, cluster))
      .sort((a, b) => b.score - a.score);

    const bestMatch = matches[0];

    if (
      bestMatch &&
      (bestMatch.decision === "same_story" || bestMatch.decision === "related_coverage")
    ) {
      clusters = clusters.map((cluster) =>
        cluster.clusterId === bestMatch.clusterId
          ? addItemToCluster(item, cluster, bestMatch.score, bestMatch.reasons, bestMatch.decision)
          : cluster
      );
    } else {
      clusters.push(createNewStoryCluster(item));
    }
  }

  return clusters.sort(
    (a, b) => new Date(b.lastPublishedAt).getTime() - new Date(a.lastPublishedAt).getTime()
  );
}
