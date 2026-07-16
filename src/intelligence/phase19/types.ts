// Phase 19 — Attraction Intelligence

export type AttractionStatus = "operating" | "refurbishment" | "closed" | "down" | "unknown";

export interface AttractionIntelligence {
  attractionId: string;
  attractionName: string;
  status: AttractionStatus;
  relatedClusterIds: string[];
  hasNewsAlert: boolean;
  newsAlertHeadline?: string;
  accessibilityLabel: string;
}

export interface AttractionIntelligenceMap {
  byAttractionName: Map<string, AttractionIntelligence>;
  attractionsWithNews: string[];
  refurbishmentAlerts: string[];
  computedAt: number;
}
