// Phase 15 — Analytics types
// Depends on: Phase 1 (Source, FeedItem), Phase 3 (StoryCluster), Phase 4 (ClassificationResult)
// All metrics are derived from local data — no external tracking or user identification.

export type SourceHealthStatus = "healthy" | "slow" | "failing" | "silent";

export interface SourceHealthStat {
  sourceId: string;
  sourceName: string;
  totalItems: number;
  itemsLast24h: number;
  itemsLast7d: number;
  lastItemAt?: string;
  lastRefreshSucceeded?: boolean;
  lastErrorMessage?: string;
  status: SourceHealthStatus;
  contentType: string;
}

export interface CoverageGapEntry {
  locationId: string;
  locationLabel: string;
  itemsLast24h: number;
  clustersLast24h: number;
  hasCoverage: boolean;
}

export interface DuplicateMetrics {
  totalItems: number;
  clusterCount: number;
  avgItemsPerCluster: number;
  singletonClusters: number;
  mergeRate: number; // 0–1: proportion of items that were merged into multi-item clusters
  socialPostCount: number;
  socialDedupeCount: number; // estimated social reposts removed
}

export interface FeedQualityReport {
  totalSources: number;
  activeSources: number;
  failingSources: number;
  silentSources: number;
  totalItems: number;
  officialItems: number;
  breakingItems: number;
  videoItems: number;
  podcastItems: number;
  computedAt: number;
}

export interface ContentAnalytics {
  sourceHealth: SourceHealthStat[];
  coverageGaps: CoverageGapEntry[];
  duplicateMetrics: DuplicateMetrics;
  feedQuality: FeedQualityReport;
  topSourcesByVolume: SourceHealthStat[];
  computedAt: number;
}
