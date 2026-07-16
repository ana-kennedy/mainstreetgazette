import { Platform } from "react-native";
import type { AnnouncementLevel, FeedItem, Source } from "../domain/models";
import i18n from "../i18n";
import { a11yDuration, contentTypeDisplayName, relativePublishedText, sourceTypeDisplayName, trustLabelDisplayName } from "./formatting";

export interface FeedItemAccessibilityPayload {
  label: string;
  value?: string;
  hint: string;
  actions: string[];
}

export function isAccessibilityTopic(item: FeedItem): boolean {
  if (item.classification?.isAccessibilityRelevant) return true;
  const tagHit = item.tags.some((tag) => tag.toLowerCase().includes("accessibility"));
  if (tagHit) return true;
  return (item.topicMatches ?? []).some((topic) =>
    topic.topicName.toLowerCase().includes("accessibility")
  );
}

export function buildFeedItemAccessibility(
  item: FeedItem,
  sourceName?: string,
  announcementLevel: AnnouncementLevel = "all"
): FeedItemAccessibilityPayload {
  const source = sourceName ?? item.authorOrChannel ?? i18n.t("a11y.unknownSource");
  const authorText =
    item.authorOrChannel && item.authorOrChannel !== sourceName
      ? i18n.t("a11y.author", { name: item.authorOrChannel })
      : undefined;

  let parts: (string | undefined)[];

  if (announcementLevel === "simple") {
    // Title first, content type second — mirrors the on-screen headline-first layout.
    // Truncate title to ~60 chars so the full label fits on a ~40-char braille display
    // in at most two pans.
    const title = item.title.length > 60 ? item.title.slice(0, 59) + "…" : item.title;
    parts = [
      `${title}.`,
      contentTypeDisplayName(item.contentType),
      item.isNewRelativeToCheckpoint ? i18n.t("a11y.new") : undefined,
    ];
  } else if (announcementLevel === "normal") {
    // Title, then type + source + age — headline leads, same as the visual layout.
    parts = [
      `${item.title}.`,
      `${contentTypeDisplayName(item.contentType)}.`,
      i18n.t("a11y.source", { name: source }),
      relativePublishedText(item.publishedAt),
      item.isNewRelativeToCheckpoint ? i18n.t("a11y.new") : undefined,
      item.isSaved ? i18n.t("a11y.savedLabel") : undefined,
    ];
  } else {
    // All detail: title, source, author, age, duration, entity/topic tags, status.
    const hasProgress =
      item.mediaPlaybackState &&
      item.mediaPlaybackState.positionSeconds > 0 &&
      !item.mediaPlaybackState.isCompleted;

    const topEntityNames = (item.entityMatches ?? [])
      .slice(0, 2)
      .map((e) => e.entityName);
    const topTopicNames = (item.topicMatches ?? [])
      .slice(0, 2)
      .map((t) => t.topicName);
    const topicNames = isAccessibilityTopic(item)
      ? [...topTopicNames.filter((name) => name.toLowerCase() !== "accessibility"), "Accessibility topic"]
      : topTopicNames;
    const tagsMention =
      [...topEntityNames, ...topicNames].length > 0
        ? [...topEntityNames, ...topicNames].join(", ") + "."
        : undefined;

    parts = [
      `${item.title}.`,
      `${contentTypeDisplayName(item.contentType)}.`,
      i18n.t("a11y.source", { name: source }),
      authorText,
      relativePublishedText(item.publishedAt),
      hasProgress
        ? i18n.t("a11y.playbackProgress", {
            position: a11yDuration(item.mediaPlaybackState!.positionSeconds),
            total: a11yDuration(item.durationSeconds),
          })
        : item.durationSeconds && item.durationSeconds > 0
          ? i18n.t("a11y.duration", { clock: a11yDuration(item.durationSeconds) })
          : undefined,
      tagsMention,
      item.isNewRelativeToCheckpoint ? i18n.t("a11y.new") : undefined,
      item.isSaved ? i18n.t("a11y.savedLabel") : undefined,
      item.contentType === "podcast" && item.isDownloaded ? i18n.t("a11y.downloaded") : undefined,
    ];
  }

  const actions = [
    item.isSaved ? i18n.t("a11y.unsave") : i18n.t("a11y.save"),
  ];
  if (item.groupID) actions.push(i18n.t("a11y.expandGroup"));
  if (item.contentType === "video") actions.push(i18n.t("a11y.openInYouTube"));
  if (item.contentType === "podcast") {
    const hasProgress =
      item.mediaPlaybackState &&
      item.mediaPlaybackState.positionSeconds > 0 &&
      !item.mediaPlaybackState.isCompleted;
    actions.push(hasProgress ? i18n.t("a11y.resumePodcast") : i18n.t("a11y.playPodcast"));
    actions.push(i18n.t("a11y.addToQueue"));
  }

  return {
    label: parts.filter(Boolean).join(" "),
    value: item.summary ?? undefined,
    hint: hintForItem(item),
    actions,
  };
}

export function hintForItem(item: FeedItem): string {
  if (Platform.OS === "ios") {
    return item.contentType === "podcast"
      ? i18n.t("a11y.itemHintIosPodcast")
      : i18n.t("a11y.itemHintIos");
  }
  return item.contentType === "podcast"
    ? i18n.t("a11y.itemHintAndroidPodcast")
    : i18n.t("a11y.itemHintAndroid");
}

export function sourceAccessibilityLabel(source: Source): string {
  return i18n.t("a11y.sourceLabel", {
    name: source.name,
    type: sourceTypeDisplayName(source.sourceType),
    trust: trustLabelDisplayName(source.trustLabel),
    state: source.isEnabled ? i18n.t("a11y.enabled") : i18n.t("a11y.disabled"),
  });
}

export function sourceAccessibilityHint(source: Source): string {
  return source.isEnabled ? i18n.t("a11y.disableHint") : i18n.t("a11y.enableHint");
}
