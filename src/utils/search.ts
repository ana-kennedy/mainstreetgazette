import type { FeedItem, Source } from "../domain/models";

export function searchFeedItems(items: FeedItem[], query: string): FeedItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(needle) ||
      (item.summary?.toLowerCase().includes(needle) ?? false) ||
      (item.authorOrChannel?.toLowerCase().includes(needle) ?? false) ||
      item.tags.join(" ").toLowerCase().includes(needle)
    );
  });
}

export function searchSources(sources: Source[], query: string): Source[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return sources;
  return sources.filter((source) => {
    return (
      source.name.toLowerCase().includes(needle) ||
      (source.description?.toLowerCase().includes(needle) ?? false) ||
      source.categoryTags.join(" ").toLowerCase().includes(needle)
    );
  });
}
