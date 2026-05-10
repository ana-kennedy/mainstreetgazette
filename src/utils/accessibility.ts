import { Platform } from "react-native";
import type { FeedItem, Source } from "../domain/models";
import { clockString, contentTypeDisplayName, relativePublishedText, sourceTypeDisplayName, trustLabelDisplayName } from "./formatting";

export interface FeedItemAccessibilityPayload {
  label: string;
  value?: string;
  hint: string;
  actions: string[];
}

export function buildFeedItemAccessibility(item: FeedItem, sourceName?: string): FeedItemAccessibilityPayload {
  const authorText = item.authorOrChannel && item.authorOrChannel !== sourceName ? `Author: ${item.authorOrChannel}.` : undefined;
  const parts = [
    `${contentTypeDisplayName(item.contentType)}.`,
    item.title,
    `Source: ${sourceName ?? item.authorOrChannel ?? "Unknown Source"}.`,
    authorText,
    relativePublishedText(item.publishedAt),
    item.durationSeconds && item.durationSeconds > 0 ? `Duration ${clockString(item.durationSeconds)}.` : undefined,
    item.isNewRelativeToCheckpoint ? "New." : undefined,
    item.isSaved ? "Saved." : undefined,
    item.contentType === "podcast" && item.isDownloaded ? "Downloaded." : undefined
  ].filter(Boolean);

  const actions = [item.isSaved ? "Unsave" : "Save", "Open"];
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
  if (Platform.OS === "ios") {
    if (item.contentType === "podcast") {
      return "Double tap to open episode. Swipe up or down to access Save, Copy Link, Share, and Set Marker actions.";
    }
    return "Double tap to open. Swipe up or down to access Save, Copy Link, Share, and Set Marker actions.";
  }
  if (item.contentType === "podcast") {
    return "Double tap to open episode. Double tap and hold for more options including Save, Copy Link, Share, and Set Marker.";
  }
  return "Double tap to open. Double tap and hold for more options including Save, Copy Link, Share, and Set Marker.";
}

export function sourceAccessibilityLabel(source: Source): string {
  const enabled = source.isEnabled ? "Enabled." : "Disabled.";
  return `${source.name}. ${sourceTypeDisplayName(source.sourceType)} source. ${trustLabelDisplayName(source.trustLabel)}. ${enabled}`;
}

export function sourceAccessibilityHint(source: Source): string {
  return source.isEnabled ? "Double tap to disable this source." : "Double tap to enable this source.";
}
