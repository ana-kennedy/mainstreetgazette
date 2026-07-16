// Phase 14 — Media Hub service
// Depends on:
//   Phase 1 (FeedItem, Source) — video/podcast items, source trust labels
//   Phase 3 (StoryCluster) — links media to story context, breaking/official flags
//   Phase 4 (ClassificationResult) — importanceScore for cluster-linked media

import type { FeedItem, Source } from "../../domain/models";
import type { StoryCluster } from "../../types/storyTypes";
import {
  MEDIA_SCORE_WEIGHTS,
  MEDIA_WINDOW_24H_MS,
  MEDIA_WINDOW_72H_MS,
  VIDEO_LIMIT,
  PODCAST_LIMIT,
  OFFICIAL_VIDEO_LIMIT,
} from "./rules";
import type { MediaHub, MediaHubItem, MediaHubItemType } from "./types";

export interface MediaHubInput {
  feedItems: FeedItem[];
  sources: Source[];
  clusters: StoryCluster[];
  now?: Date;
}

// ── Cluster index for linking media to story context ──────────────────────────

function buildItemToClusterMap(clusters: StoryCluster[]): Map<string, StoryCluster> {
  const map = new Map<string, StoryCluster>();
  for (const cluster of clusters) {
    for (const item of cluster.items) {
      map.set(item.itemId, cluster);
    }
    // Also index by primaryItemId for direct lookup
    map.set(cluster.primaryItemId, cluster);
  }
  return map;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreMediaItem(
  item: FeedItem,
  source: Source | undefined,
  cluster: StoryCluster | undefined,
  nowMs: number,
): number {
  let score = 0;

  if (source?.trustLabel === "official") score += MEDIA_SCORE_WEIGHTS.officialSource;
  if (item.thumbnailURL) score += MEDIA_SCORE_WEIGHTS.hasThumbnail;
  if (item.artworkURL) score += MEDIA_SCORE_WEIGHTS.hasArtwork;

  if (cluster) {
    score += MEDIA_SCORE_WEIGHTS.linkedToCluster;
    if (cluster.officialSourcePresent) score += MEDIA_SCORE_WEIGHTS.clusterIsOfficial;
    if (cluster.breakingScore >= 70) score += MEDIA_SCORE_WEIGHTS.clusterIsBreaking;
    const importance = cluster.classification?.importanceScore ?? 50;
    if (importance >= 70) score += MEDIA_SCORE_WEIGHTS.highImportanceCluster;
  }

  const age = nowMs - new Date(item.publishedAt).getTime();
  if (age <= MEDIA_WINDOW_24H_MS) score += MEDIA_SCORE_WEIGHTS.freshnessBonus24h;
  else if (age <= MEDIA_WINDOW_72H_MS) score += MEDIA_SCORE_WEIGHTS.freshnessBonus72h;

  return score;
}

// ── Duration formatting for a11y ──────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ${m} minute${m !== 1 ? "s" : ""}`;
  return `${m} minute${m !== 1 ? "s" : ""}`;
}

// ── Build a MediaHubItem ──────────────────────────────────────────────────────

function toMediaHubItem(
  item: FeedItem,
  type: MediaHubItemType,
  source: Source | undefined,
  cluster: StoryCluster | undefined,
  score: number,
): MediaHubItem {
  const isOfficial = source?.trustLabel === "official";
  const sourceName = source?.name ?? item.sourceID;

  const typeLabel = type === "video" ? "Video" : type === "podcast" ? "Podcast" : "Community";
  const durationLabel =
    item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : "";
  const officialLabel = isOfficial ? " Official channel." : "";

  return {
    id: item.id,
    feedItemId: item.id,
    type,
    title: item.title,
    sourceName,
    sourceId: item.sourceID,
    publishedAt: item.publishedAt,
    thumbnailURL: item.thumbnailURL ?? undefined,
    artworkURL: item.artworkURL ?? undefined,
    durationSeconds: item.durationSeconds ?? undefined,
    isOfficial,
    score,
    clusterId: cluster?.clusterId,
    accessibilityLabel: `${typeLabel}. ${item.title}. ${sourceName}${durationLabel}.${officialLabel}`,
    accessibilityHint: type === "podcast"
      ? "Double tap to play this podcast episode."
      : "Double tap to open this video.",
  };
}

// ── Deduplication — same canonical URL = same item ────────────────────────────

function dedupe(items: MediaHubItem[]): MediaHubItem[] {
  // Use feedItemId as unique key — FeedItems are already deduped at ingestion
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.feedItemId)) return false;
    seen.add(item.feedItemId);
    return true;
  });
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function buildMediaHub(input: MediaHubInput): MediaHub {
  const { feedItems, sources, clusters, now = new Date() } = input;
  const nowMs = now.getTime();

  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const itemToCluster = buildItemToClusterMap(clusters);

  const scoredVideos: MediaHubItem[] = [];
  const scoredPodcasts: MediaHubItem[] = [];

  for (const item of feedItems) {
    if (item.contentType !== "video" && item.contentType !== "podcast") continue;

    const source = sourceMap.get(item.sourceID);
    const cluster = itemToCluster.get(item.id);
    const score = scoreMediaItem(item, source, cluster, nowMs);
    const type: MediaHubItemType = item.contentType === "video" ? "video" : "podcast";
    const mediaItem = toMediaHubItem(item, type, source, cluster, score);

    if (type === "video") scoredVideos.push(mediaItem);
    else scoredPodcasts.push(mediaItem);
  }

  scoredVideos.sort((a, b) => b.score - a.score);
  scoredPodcasts.sort((a, b) => b.score - a.score);

  const videos = dedupe(scoredVideos).slice(0, VIDEO_LIMIT);
  const podcasts = dedupe(scoredPodcasts).slice(0, PODCAST_LIMIT);
  const officialVideos = videos.filter((v) => v.isOfficial).slice(0, OFFICIAL_VIDEO_LIMIT);

  return { videos, podcasts, officialVideos, computedAt: nowMs };
}
