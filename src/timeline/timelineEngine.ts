import type {
  TimelineBucket,
  TimelineFilter,
  TimelineMetadata,
  TimelineStory,
  LifecycleStage,
  CoverageCounts,
} from "./timelineTypes";
import type { StoryCluster } from "../types/storyTypes";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getSmartScore(story: TimelineStory): number {
  const t = story.timeline;
  const officialBoost = t.hasOfficialSource ? 25 : 0;
  const velocityBoost = Math.min(t.updateCount24h * 3, 18);
  const mediaBoost =
    (t.hasVideo ? 4 : 0) + (t.hasPodcast ? 4 : 0) + (t.hasCommunityDiscussion ? 4 : 0);
  return t.importanceScore + t.freshnessScore + officialBoost + velocityBoost + mediaBoost;
}

export function getBreakingScore(story: TimelineStory): number {
  const t = story.timeline;
  const officialBoost = t.hasOfficialSource ? 30 : 0;
  const velocityBoost = Math.min(t.updateCount24h * 5, 25);
  return t.importanceScore + t.freshnessScore + officialBoost + velocityBoost;
}

export function isWithinDateRange(
  dateIso: string,
  range: NonNullable<TimelineFilter["dateRange"]>,
  now = new Date()
): boolean {
  const date = new Date(dateIso);
  const diff = now.getTime() - date.getTime();
  switch (range) {
    case "today":
      return date.toDateString() === now.toDateString();
    case "yesterday": {
      const yesterday = new Date(now.getTime() - DAY_MS);
      return date.toDateString() === yesterday.toDateString();
    }
    case "last3Days":
      return diff >= 0 && diff <= 3 * DAY_MS;
    case "thisWeek":
      return diff >= 0 && diff <= 7 * DAY_MS;
    case "thisMonth":
      return diff >= 0 && diff <= 31 * DAY_MS;
    default:
      return true;
  }
}

export function applyTimelineFilter(
  stories: TimelineStory[],
  filter: TimelineFilter,
  now = new Date()
): TimelineStory[] {
  let result = [...stories];
  if (filter.dateRange) {
    result = result.filter((s) => isWithinDateRange(s.timeline.latestUpdateAt, filter.dateRange!, now));
  }
  if (filter.requiresOfficialSource) {
    result = result.filter((s) => s.timeline.hasOfficialSource);
  }
  if (filter.requiresMediaType === "video") {
    result = result.filter((s) => s.timeline.hasVideo);
  }
  if (filter.requiresMediaType === "podcast") {
    result = result.filter((s) => s.timeline.hasPodcast);
  }
  if (filter.requiresMediaType === "community") {
    result = result.filter((s) => s.timeline.hasCommunityDiscussion);
  }
  if (filter.requiresSaved) {
    result = result.filter((s) => s.isSaved);
  }
  return sortTimelineStories(result, filter.sortMode);
}

export function sortTimelineStories(
  stories: TimelineStory[],
  sortMode: TimelineFilter["sortMode"]
): TimelineStory[] {
  return [...stories].sort((a, b) => {
    if (sortMode === "smartScore") return getSmartScore(b) - getSmartScore(a);
    if (sortMode === "breakingScore") return getBreakingScore(b) - getBreakingScore(a);
    return new Date(b.timeline.latestUpdateAt).getTime() - new Date(a.timeline.latestUpdateAt).getTime();
  });
}

export function getRelativeTimelineLabel(dateIso: string, now = new Date()): string {
  const date = new Date(dateIso);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export function getCoverageSummary(story: TimelineStory): string {
  const parts: string[] = [];
  const c = story.coverageCounts;
  if (c.official > 0) parts.push("official source");
  if (c.articles > 0) parts.push(`${c.articles} ${c.articles === 1 ? "article" : "articles"}`);
  if (c.videos > 0) parts.push(`${c.videos} ${c.videos === 1 ? "video" : "videos"}`);
  if (c.podcasts > 0) parts.push(`${c.podcasts} ${c.podcasts === 1 ? "podcast" : "podcasts"}`);
  if (c.community > 0)
    parts.push(`${c.community} community ${c.community === 1 ? "discussion" : "discussions"}`);
  return parts.join(", ");
}

function computeFreshnessScore(publishedAt: string): number {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / 3600000;
  if (ageHours <= 2) return 40;
  if (ageHours <= 24) return 30;
  if (ageHours <= 48) return 20;
  if (ageHours <= 72) return 12;
  if (ageHours <= 168) return 6;
  return 0;
}

function computeTimelineBucket(publishedAt: string): TimelineBucket {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / 3600000;
  if (ageHours <= 3) return "breaking";
  if (ageHours <= 24) return "today";
  if (ageHours <= 48) return "yesterday";
  if (ageHours <= 72) return "last3Days";
  if (ageHours <= 168) return "thisWeek";
  if (ageHours <= 720) return "thisMonth";
  return "older";
}

function inferLifecycleStage(cluster: StoryCluster): LifecycleStage {
  const cls = cluster.classification;
  if (!cls) return "historical";
  if (cls.isRumorOrSpeculation) return "rumor";
  if (cls.topics.includes("construction") && cls.topics.includes("ride_closure_refurbishment"))
    return "constructionStarted";
  if (cls.topics.includes("ride_closure_refurbishment")) {
    if (cls.isOfficialAnnouncement) return "closureAnnounced";
    return "refurbishment";
  }
  if (cls.topics.includes("new_attraction")) {
    if (cls.isOfficialAnnouncement) return "officiallyAnnounced";
    return "rumor";
  }
  if (cls.topics.includes("construction")) return "constructionStarted";
  if (cls.isOfficialAnnouncement) return "officiallyAnnounced";
  if (cls.isReviewOrOpinion) return "reviewPhase";
  return "historical";
}

export function clusterToTimelineStory(
  cluster: StoryCluster,
  savedItemIDs: Set<string>
): TimelineStory {
  const now = Date.now();
  const updateCount24h = cluster.items.filter(
    (item) => now - new Date(item.publishedAt).getTime() <= DAY_MS
  ).length;

  const timeline: TimelineMetadata = {
    firstSeenAt: cluster.firstPublishedAt,
    latestUpdateAt: cluster.lastPublishedAt,
    primaryPublishedAt: cluster.firstPublishedAt,
    timelineBucket: computeTimelineBucket(cluster.lastPublishedAt),
    lifecycleStage: inferLifecycleStage(cluster),
    importanceScore: cluster.classification?.importanceScore ?? 20,
    freshnessScore: computeFreshnessScore(cluster.lastPublishedAt),
    updateCount24h,
    hasOfficialSource: cluster.officialSourcePresent,
    hasVideo: cluster.videoCount > 0,
    hasPodcast: cluster.podcastCount > 0,
    hasCommunityDiscussion: cluster.communityCount > 0,
  };

  const coverageCounts: CoverageCounts = {
    articles: cluster.articleCount,
    videos: cluster.videoCount,
    podcasts: cluster.podcastCount,
    community: cluster.communityCount,
    official: cluster.officialSourcePresent ? 1 : 0,
  };

  return {
    id: cluster.clusterId,
    headline: cluster.canonicalTitle,
    summary: cluster.shortSummary,
    primaryParkId: cluster.parks[0],
    relatedEntityIds: cluster.entities,
    topics: cluster.topics,
    timeline,
    coverageCounts,
    isSaved: savedItemIDs.has(cluster.primaryItemId),
  };
}
