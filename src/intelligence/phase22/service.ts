import type { StoryCluster } from "../../types/storyTypes";
import {
  CROWD_KEYWORDS,
  MAX_TIPS,
  NEW_ATTRACTION_KEYWORDS,
  REFURB_KEYWORDS,
} from "./rules";
import type { TripPlanningIntelligence, TripPlanningTip } from "./types";

export interface TripPlanningInput {
  parkTagKey: string;
  clusters: StoryCluster[];
  activeEventTitles?: string[];   // from Phase 13 EventCalendar
  now?: Date;
}

function clusterIsForPark(cluster: StoryCluster, parkTagKey: string): boolean {
  if (cluster.parks.includes(`park:${parkTagKey}`)) return true;
  if (cluster.parks.some((p) => p.toLowerCase().includes(parkTagKey.replace(/_/g, " ")))) return true;
  return cluster.parks.length === 0;
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function buildTripPlanningIntelligence(input: TripPlanningInput): TripPlanningIntelligence {
  const { parkTagKey, clusters, activeEventTitles = [], now = new Date() } = input;
  const tips: TripPlanningTip[] = [];
  const seenTypes = new Set<string>();
  const parkClusters = clusters.filter((c) => clusterIsForPark(c, parkTagKey));

  // 1. Active events at this park → trip planning tip
  if (activeEventTitles.length > 0 && tips.length < MAX_TIPS && !seenTypes.has("event_overlap")) {
    const eventSummary =
      activeEventTitles.length === 1
        ? activeEventTitles[0]
        : `${activeEventTitles[0]} and ${activeEventTitles.length - 1} more`;
    tips.push({
      id: "event_overlap",
      type: "event_overlap",
      headline: "Active events at this park",
      detail: eventSummary,
      urgency: "highlight",
      accessibilityLabel: `Highlight: Active events at this park. ${eventSummary}.`,
    });
    seenTypes.add("event_overlap");
  }

  // 2. Refurbishments in recent news
  const refurbCluster = parkClusters.find((c) =>
    matchesKeywords(c.canonicalTitle, REFURB_KEYWORDS),
  );
  if (refurbCluster && !seenTypes.has("refurb_alert")) {
    tips.push({
      id: "refurb_alert",
      type: "refurb_alert",
      headline: "Refurbishment alert",
      detail: refurbCluster.canonicalTitle,
      urgency: "caution",
      accessibilityLabel: `Caution: Refurbishment alert. ${refurbCluster.canonicalTitle}.`,
    });
    seenTypes.add("refurb_alert");
  }

  // 3. New attraction opening
  const newAttrCluster = parkClusters.find((c) =>
    matchesKeywords(c.canonicalTitle, NEW_ATTRACTION_KEYWORDS),
  );
  if (newAttrCluster && !seenTypes.has("new_attraction")) {
    tips.push({
      id: "new_attraction",
      type: "new_attraction",
      headline: "New attraction opening",
      detail: newAttrCluster.canonicalTitle,
      urgency: "highlight",
      accessibilityLabel: `Highlight: New attraction opening. ${newAttrCluster.canonicalTitle}.`,
    });
    seenTypes.add("new_attraction");
  }

  // 4. Crowd alert
  const crowdCluster = parkClusters.find((c) =>
    matchesKeywords(c.canonicalTitle, CROWD_KEYWORDS),
  );
  if (crowdCluster && !seenTypes.has("crowd_alert")) {
    tips.push({
      id: "crowd_alert",
      type: "crowd_alert",
      headline: "Crowd alert in the news",
      detail: crowdCluster.canonicalTitle,
      urgency: "caution",
      accessibilityLabel: `Caution: Crowd alert in the news. ${crowdCluster.canonicalTitle}.`,
    });
    seenTypes.add("crowd_alert");
  }

  const hasUrgentTip = tips.some((t) => t.urgency === "caution" || t.urgency === "highlight");

  return {
    parkTagKey,
    tips,
    hasUrgentTip,
    computedAt: now.getTime(),
  };
}
