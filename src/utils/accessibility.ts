import type { FeedItem, Source } from "../domain/models";
import { clockString, contentTypeDisplayName, relativePublishedText, sourceTypeDisplayName, trustLabelDisplayName } from "./formatting";

export interface FeedItemAccessibilityPayload {
  label: string;
  value?: string;
  hint: string;
  actions: string[];
}

export function buildFeedItemAccessibility(item: FeedItem): FeedItemAccessibilityPayload {
  const parts = [
    `${contentTypeDisplayName(item.contentType)}.`,
    item.title,
    `Source: ${item.authorOrChannel ?? "Unknown Source"}.`,
    relativePublishedText(item.publishedAt),
    item.durationSeconds && item.durationSeconds > 0 ? `Duration ${clockString(item.durationSeconds)}.` : undefined,
    item.isNewRelativeToCheckpoint ? "New." : undefined,
    item.isSaved ? "Saved." : undefined,
    item.contentType === "podcast" && item.isDownloaded ? "Downloaded." : undefined
  ].filter(Boolean);

  const actions = ["Open", "Set checkpoint here", item.isSaved ? "Unsave" : "Save"];
  if (item.groupID) actions.push("Expand group");
  if (item.contentType === "video") actions.push("Open in YouTube");
  if (item.contentType === "podcast") {
    const hasProgress = item.mediaPlaybackState && item.mediaPlaybackState.positionSeconds > 0 && !item.mediaPlaybackState.isCompleted;
    actions.push(hasProgress ? "Resume podcast" : "Play podcast");
    actions.push("Add to queue");
  }

  return {
    label: parts.join(" "),
    value: item.summary ?? undefined,
    hint: hintForItem(item),
    actions
  };
}

export function hintForItem(item: FeedItem): string {
  if (item.contentType === "article") {
    return "Double tap to open article. Use the Save button to keep it for later.";
  }
  if (item.contentType === "video") {
    return "Double tap to open video. Use the Save button to keep it for later.";
  }
  return "Double tap to play or open episode. Playback controls are available in the mini player.";
}

export function sourceAccessibilityLabel(source: Source): string {
  const enabled = source.isEnabled ? "Enabled." : "Disabled.";
  return `${source.name}. ${sourceTypeDisplayName(source.sourceType)} source. ${trustLabelDisplayName(source.trustLabel)}. ${enabled}`;
}

export function sourceAccessibilityHint(source: Source): string {
  return source.isEnabled ? "Double tap to disable this source." : "Double tap to enable this source.";
}
