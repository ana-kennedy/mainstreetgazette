import type { ContentType, SortOrder } from "../domain/models";
import type { AdaptiveSelectorOption } from "../components/AccessibleAdaptiveSelector";

export type ContentScope = "all" | "articles" | "official" | "videos" | "podcasts" | "community";

export const CONTENT_SCOPE_OPTIONS: readonly AdaptiveSelectorOption<ContentScope>[] = [
  { label: "All Content", value: "all", brailleLabel: "All" },
  { label: "Articles", value: "articles", brailleLabel: "Articles" },
  { label: "Official Disney", value: "official", brailleLabel: "Official" },
  { label: "Videos", value: "videos", brailleLabel: "Videos" },
  { label: "Podcasts", value: "podcasts", brailleLabel: "Podcasts" },
  { label: "Community", value: "community", brailleLabel: "Community" },
];

export const FEED_SORT_OPTIONS: readonly AdaptiveSelectorOption<SortOrder>[] = [
  { label: "Newest First", value: "newestFirst", brailleLabel: "Newest" },
  { label: "Oldest First", value: "oldestFirst", brailleLabel: "Oldest" },
];

export function contentScopeToTimelineFilter(scope: ContentScope): "all" | ContentType | "social" {
  switch (scope) {
    case "articles":
      return "article";
    case "videos":
      return "video";
    case "podcasts":
      return "podcast";
    case "community":
      return "social";
    case "all":
    case "official":
      return "all";
  }
}

export function timelineFilterToContentScope(filter: "all" | ContentType | "social"): ContentScope {
  switch (filter) {
    case "article":
      return "articles";
    case "video":
      return "videos";
    case "podcast":
      return "podcasts";
    case "community":
    case "social":
      return "community";
    case "all":
      return "all";
  }
}

export function contentScopeAnnouncement(scope: ContentScope): string {
  switch (scope) {
    case "all":
      return "Showing all content";
    case "articles":
      return "Showing articles only";
    case "official":
      return "Showing official Disney content only";
    case "videos":
      return "Showing videos only";
    case "podcasts":
      return "Showing podcasts only";
    case "community":
      return "Showing community content only";
  }
}

export function sortAnnouncement(sortOrder: SortOrder): string {
  return sortOrder === "oldestFirst" ? "Showing oldest first" : "Showing newest first";
}
