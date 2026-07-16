import type { ContentItem, StoryCluster } from "../types/storyTypes";

export function isExactUrlDuplicate(item: ContentItem, cluster: StoryCluster): string | null {
  const canonicalUrl = item.canonicalUrl ?? item.url;
  const match = cluster.items.find(
    (existing) => (existing.canonicalUrl ?? existing.url) === canonicalUrl
  );
  return match?.itemId ?? null;
}

export function isSameSourceSocialRepost(item: ContentItem, cluster: StoryCluster): string | null {
  const socialPlatforms = new Set(["x", "threads", "facebook", "instagram", "bluesky"]);
  if (!socialPlatforms.has(item.platform)) return null;

  const sameSourceArticle = cluster.items.find(
    (existing) =>
      existing.sourceId === item.sourceId &&
      existing.contentType === "article" &&
      !existing.isHiddenDuplicate
  );

  if (!sameSourceArticle) return null;

  const socialText = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  const articleUrl = sameSourceArticle.canonicalUrl ?? sameSourceArticle.url;

  if (socialText.includes(articleUrl.toLowerCase()) || item.url === articleUrl) {
    return sameSourceArticle.itemId;
  }

  return null;
}

export function shouldPreserveAsRelatedMedia(item: ContentItem): boolean {
  return (
    item.contentType === "video" ||
    item.contentType === "podcast" ||
    item.contentType === "community" ||
    item.contentType === "forum"
  );
}
