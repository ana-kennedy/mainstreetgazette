// Phase 20 — Dining Intelligence

export type DiningCategory =
  | "table_service"
  | "quick_service"
  | "signature"
  | "character_dining"
  | "lounge"
  | "festival_food";

export interface DiningCluster {
  clusterId: string;
  headline: string;
  publishedAt: string;
  sourceCount: number;
  isOfficial: boolean;
  diningEntityName?: string;
  accessibilityLabel: string;
}

export interface ParkDiningIntelligence {
  parkTagKey: string;
  diningClusters: DiningCluster[];
  topDiningEntities: string[];
  computedAt: number;
}
