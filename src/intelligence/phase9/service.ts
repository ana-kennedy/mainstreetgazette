// Phase 9 — Notification Intelligence service
// Depends on:
//   Phase 3 (StoryCluster) — clusters and source counts
//   Phase 4 (ClassificationResult) — importanceScore, breakingScore, isOfficialAnnouncement
//   Phase 7 (UserPersonalizationPreferences) — notification profile, mutes, favorites
//   Phase 7 (notificationSelector) — baseline shouldNotifyForStory
//   UserSettings — quietHoursEnabled, breakingNewsEnabled, dailyDigestEnabled

import type { StoryCluster } from "../../types/storyTypes";
import type { UserPersonalizationPreferences } from "../../personalization/personalizationTypes";
import type { UserSettings } from "../../domain/models";
import { clusterToStoryClusterLike } from "../../personalization/clusterAdapter";
import { shouldNotifyForStory } from "../../personalization/notificationSelector";
import {
  NOTIFICATION_SCORES,
  MIN_IMPORTANCE_BY_PROFILE,
  BREAKING_SCORE_THRESHOLD,
  WATCH_IMPORTANCE_MIN,
  DIGEST_SCORE_CEILING,
  DIGEST_MAX_HEADLINES,
  QUIET_HOURS_START,
  QUIET_HOURS_END,
  DISNEY_MOMENT_TOPICS,
} from "./rules";
import type {
  DigestPayload,
  NotificationBatch,
  NotificationDecision,
  NotificationPayload,
  NotificationType,
} from "./types";

export interface NotificationEvaluationInput {
  clusters: StoryCluster[];
  prefs: UserPersonalizationPreferences;
  settings: UserSettings;
  seenClusterIDs?: Set<string>;
  now?: Date;
}

// ── Quiet hours ──────────────────────────────────────────────────────────────

export function isInQuietHours(settings: UserSettings, now: Date = new Date()): boolean {
  if (!settings.quietHoursEnabled) return false;
  const hour = now.getHours();
  if (QUIET_HOURS_START > QUIET_HOURS_END) {
    // Crosses midnight (e.g. 22–7)
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  }
  return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
}

// ── Notification scoring ─────────────────────────────────────────────────────

export function scoreClusterForNotification(
  cluster: StoryCluster,
  prefs: UserPersonalizationPreferences,
): { score: number; type: NotificationType; approvedReason: string } {
  const importance = cluster.classification?.importanceScore ?? 50;
  const isBreaking = cluster.breakingScore >= BREAKING_SCORE_THRESHOLD;
  const isOfficial = cluster.classification?.isOfficialAnnouncement ?? cluster.officialSourcePresent;
  const isMultiSource = cluster.sourceCount >= 3;

  let score = 0;
  let type: NotificationType = "standard";
  let approvedReason = "";

  // Official major announcement — highest priority
  if (isOfficial && importance >= 75) {
    score = NOTIFICATION_SCORES.officialMajorAnnouncement;
    type = "official_announcement";
    approvedReason = "Official announcement";
  } else if (isBreaking && isMultiSource) {
    score = NOTIFICATION_SCORES.breakingMultiSource;
    type = "breaking";
    approvedReason = "Breaking: multiple sources";
  } else if (isBreaking) {
    score = Math.round(NOTIFICATION_SCORES.breakingMultiSource * 0.85);
    type = "breaking";
    approvedReason = "Breaking story";
  } else if (isOfficial) {
    score = Math.round(NOTIFICATION_SCORES.officialMajorAnnouncement * 0.8);
    type = "official_announcement";
    approvedReason = "Official update";
  } else {
    // Base score from importance
    score = Math.round(importance * 0.6);
    approvedReason = "Standard update";
  }

  // Boost for entity watch
  const matchesFavoriteEntity = cluster.entities.some((e) =>
    prefs.favoriteEntities.includes(e),
  );
  if (matchesFavoriteEntity && importance >= WATCH_IMPORTANCE_MIN) {
    score = Math.max(score, NOTIFICATION_SCORES.favoriteEntityUpdate);
    type = type === "breaking" || type === "official_announcement" ? type : "entity_watch";
    approvedReason = "Mentions an entity you follow";
  }

  // Boost for favorite park
  const matchesFavoritePark = cluster.parks.some((p) =>
    prefs.favoriteParks.includes(p),
  );
  if (matchesFavoritePark && importance >= WATCH_IMPORTANCE_MIN) {
    score = Math.max(score, NOTIFICATION_SCORES.favoriteParkUpdate);
    type =
      type === "breaking" || type === "official_announcement" || type === "entity_watch"
        ? type
        : "park_alert";
    approvedReason = approvedReason || "From a park you follow";
  }

  // Boost for favorite topic
  const matchesFavoriteTopic = cluster.topics.some((t) =>
    prefs.favoriteTopics.includes(t),
  );
  if (matchesFavoriteTopic) {
    score = Math.max(score, NOTIFICATION_SCORES.favoriteTopic);
    approvedReason = approvedReason || "Matches a topic you follow";
  }

  // Boost for preferred source
  if (prefs.preferredSources.includes(cluster.primarySourceId)) {
    score = Math.max(score, NOTIFICATION_SCORES.preferredSource);
    approvedReason = approvedReason || "From a source you follow";
  }

  // Phase 08 — gentle "Disney Moment" reclassification: only for clusters that never
  // earned a breaking/official/entity/park tag above, so it never dilutes those.
  if (type === "standard" && cluster.topics.some((t) => DISNEY_MOMENT_TOPICS.includes(t))) {
    type = "disney_moment";
    approvedReason = approvedReason || "A Disney moment worth knowing about";
  }

  return { score, type, approvedReason };
}

// ── Payload builder ──────────────────────────────────────────────────────────

function buildPayload(
  cluster: StoryCluster,
  type: NotificationType,
  score: number,
  approvedReason: string,
): NotificationPayload {
  const sourceName = cluster.items[0]?.sourceName ?? "Main Street Gazette";
  const headline = cluster.canonicalTitle;
  const summary = cluster.shortSummary || "";

  let title: string;
  let body: string;

  switch (type) {
    case "breaking":
      title = "🔴 Breaking Disney News";
      body = headline;
      break;
    case "official_announcement":
      title = "📢 Official Disney Announcement";
      body = headline;
      break;
    case "entity_watch":
      title = "Update on something you follow";
      body = headline;
      break;
    case "park_alert":
      title = "Park news";
      body = headline;
      break;
    case "disney_moment":
      title = "✨ A Disney Moment";
      body = headline;
      break;
    default:
      title = "Main Street Gazette";
      body = headline;
  }

  // VoiceOver-friendly body includes source and summary
  const accessibilityParts = [
    body,
    summary ? `Summary: ${summary}` : null,
    `Source: ${sourceName}`,
    approvedReason,
  ].filter(Boolean);

  return {
    id: `notification_${cluster.clusterId}`,
    type,
    title,
    body,
    accessibilityBody: accessibilityParts.join(". "),
    score,
    clusterId: cluster.clusterId,
    primaryItemId: cluster.primaryItemId,
    approvedReason,
  };
}

// ── Digest builder ────────────────────────────────────────────────────────────

export function buildDigestPayload(payloads: NotificationPayload[]): DigestPayload | undefined {
  if (payloads.length === 0) return undefined;

  const count = payloads.length;
  const headlines = payloads
    .slice(0, DIGEST_MAX_HEADLINES)
    .map((p) => p.body);

  const title = count === 1 ? "1 new Disney story" : `${count} new Disney stories`;
  const body =
    headlines.length <= 2
      ? headlines.join(" · ")
      : `${headlines.slice(0, 2).join(" · ")} and ${count - 2} more`;

  const accessibilityBody = [
    `${count} new Disney ${count === 1 ? "story" : "stories"}.`,
    ...headlines.map((h, i) => `${i + 1}. ${h}`),
  ].join(" ");

  return { title, body, accessibilityBody, storyCount: count, topHeadlines: headlines };
}

// ── Main evaluation entry point ───────────────────────────────────────────────

export function evaluateNotifications(input: NotificationEvaluationInput): NotificationBatch {
  const { clusters, prefs, settings, seenClusterIDs = new Set(), now = new Date() } = input;

  const quietHours = isInQuietHours(settings, now);
  const minImportance = MIN_IMPORTANCE_BY_PROFILE[prefs.notificationProfile] ?? 70;

  const immediate: NotificationPayload[] = [];
  const digestCandidates: NotificationPayload[] = [];
  const suppressed: NotificationDecision[] = [];

  for (const cluster of clusters) {
    const clusterId = cluster.clusterId;

    // Skip already seen clusters
    if (seenClusterIDs.has(clusterId)) {
      suppressed.push({ clusterId, shouldNotify: false, type: "standard", score: 0, suppressedBy: "already_seen" });
      continue;
    }

    // Apply Phase 7 mute rules first
    if (cluster.entities.some((e) => prefs.mutedEntities.includes(e))) {
      suppressed.push({ clusterId, shouldNotify: false, type: "standard", score: 0, suppressedBy: "muted_entity" });
      continue;
    }
    if (cluster.parks.some((p) => prefs.mutedParks.includes(p))) {
      suppressed.push({ clusterId, shouldNotify: false, type: "standard", score: 0, suppressedBy: "muted_park" });
      continue;
    }
    if (cluster.topics.some((t) => prefs.mutedTopics.includes(t))) {
      suppressed.push({ clusterId, shouldNotify: false, type: "standard", score: 0, suppressedBy: "muted_topic" });
      continue;
    }
    if (prefs.mutedSources.includes(cluster.primarySourceId)) {
      suppressed.push({ clusterId, shouldNotify: false, type: "standard", score: 0, suppressedBy: "muted_source" });
      continue;
    }

    // Phase 7 baseline gate
    const storyLike = clusterToStoryClusterLike(cluster);
    const { notify } = shouldNotifyForStory(storyLike, prefs);
    if (!notify) {
      suppressed.push({ clusterId, shouldNotify: false, type: "standard", score: 0, suppressedBy: "below_threshold" });
      continue;
    }

    // Phase 9 scoring
    const { score, type, approvedReason } = scoreClusterForNotification(cluster, prefs);

    // Phase 08 — Disney Moments is opt-in (default off); a "standard" cluster that
    // got reclassified as a moment is suppressed entirely when the toggle is off,
    // rather than falling through and notifying as generic "standard" news.
    if (type === "disney_moment" && !settings.disneyMomentsEnabled) {
      suppressed.push({ clusterId, shouldNotify: false, type, score, suppressedBy: "disney_moments_disabled" });
      continue;
    }

    // Quiet hours: suppress unless breaking/official and user allows breaking in quiet hours
    const isHighPriority = type === "breaking" || type === "official_announcement";
    if (quietHours && !isHighPriority) {
      suppressed.push({ clusterId, shouldNotify: false, type, score, suppressedBy: "quiet_hours" });
      continue;
    }

    // Breaking news only mode
    if (settings.breakingNewsEnabled === false && !isHighPriority) {
      suppressed.push({ clusterId, shouldNotify: false, type, score, suppressedBy: "breaking_only_mode" });
      continue;
    }

    // Below profile threshold — candidate for digest
    if (score < minImportance && settings.dailyDigestEnabled) {
      if (score >= DIGEST_SCORE_CEILING * 0.5) {
        digestCandidates.push(buildPayload(cluster, "digest", score, approvedReason));
      } else {
        suppressed.push({ clusterId, shouldNotify: false, type, score, suppressedBy: "below_threshold" });
      }
      continue;
    }
    if (score < minImportance) {
      suppressed.push({ clusterId, shouldNotify: false, type, score, suppressedBy: "below_threshold" });
      continue;
    }

    const payload = buildPayload(cluster, type, score, approvedReason);
    immediate.push(payload);
  }

  // Sort immediate notifications: breaking first, then by score
  immediate.sort((a, b) => {
    const typeOrder = (t: NotificationType) =>
      t === "breaking" ? 0 : t === "official_announcement" ? 1 : t === "entity_watch" ? 2 : t === "park_alert" ? 3 : 4;
    const typeDiff = typeOrder(a.type) - typeOrder(b.type);
    return typeDiff !== 0 ? typeDiff : b.score - a.score;
  });

  const digest = settings.dailyDigestEnabled
    ? buildDigestPayload(digestCandidates)
    : undefined;

  return {
    immediate,
    digest,
    suppressed,
    evaluatedAt: now.getTime(),
  };
}
