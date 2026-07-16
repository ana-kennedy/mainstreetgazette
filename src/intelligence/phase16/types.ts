// Phase 16 — Disney Graph Engine types
// Depends on: Phase 2 (entityMatches), Phase 3 (StoryCluster), Phase 4 (ClassificationResult)

// Relationship types from data/graph-relationship-types.json
export type GraphRelationshipType =
  | "located_in"
  | "part_of"
  | "near"
  | "replaced_by"
  | "related_to"
  | "mentions"
  | "covered_by"
  | "same_story_as";

export interface GraphNode {
  entityName: string;
  entityId?: string;
  parkIds: string[];
  locationIds: string[];
  // Cluster IDs that mention this entity (from Phase 3)
  clusterIds: string[];
}

export interface GraphEdge {
  fromEntity: string;
  toEntity: string;
  relationshipType: GraphRelationshipType;
  // Co-mention count across clusters — higher = more confident relationship
  weight: number;
  evidenceClusterIds: string[];
}

export interface EntityGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  computedAt: number;
}

export interface ClusterSummary {
  clusterId: string;
  primaryItemId: string;
  headline: string;
  publishedAt: string;
  sourceCount: number;
  isBreaking: boolean;
  isOfficial: boolean;
}

export interface RelatedEntityEntry {
  entityName: string;
  entityId?: string;
  relationshipType: GraphRelationshipType;
  sharedClusterCount: number;
  parkIds: string[];
  accessibilityLabel: string;
}

export interface EntityProfile {
  entityName: string;
  entityId?: string;
  parkIds: string[];
  totalClusterCount: number;
  recentClusters: ClusterSummary[];
  relatedEntities: RelatedEntityEntry[];
  accessibilityLabel: string;
}
