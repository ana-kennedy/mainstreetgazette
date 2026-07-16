import { useMemo, useState } from "react";
import { applyTimelineFilter, clusterToTimelineStory } from "./timelineEngine";
import type { TimelineFilter, TimelineStory } from "./timelineTypes";
import type { StoryCluster } from "../types/storyTypes";

export function useTimelineStories(
  clusters: StoryCluster[],
  savedItemIDs: Set<string>,
  filters: TimelineFilter[]
) {
  const defaultFilter = filters.find((f) => f.default) ?? filters[0];
  const [activeFilterId, setActiveFilterId] = useState(defaultFilter?.id ?? "topStories");

  const activeFilter = filters.find((f) => f.id === activeFilterId) ?? defaultFilter;

  const timelineStories = useMemo<TimelineStory[]>(
    () => clusters.map((c) => clusterToTimelineStory(c, savedItemIDs)),
    [clusters, savedItemIDs]
  );

  const visibleStories = useMemo<TimelineStory[]>(() => {
    if (!activeFilter) return timelineStories;
    return applyTimelineFilter(timelineStories, activeFilter);
  }, [timelineStories, activeFilter]);

  return {
    activeFilterId,
    activeFilter,
    setActiveFilterId,
    visibleStories,
  };
}
