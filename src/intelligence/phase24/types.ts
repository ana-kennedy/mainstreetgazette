// Phase 24 — Disney World Graph UI
// Drives the browsable entity graph screen from the Explore tab.

export interface GraphNodeDisplay {
  entityName: string;
  clusterCount: number;
  relatedEntityCount: number;
  parkIds: string[];
  accessibilityLabel: string;
}

export interface GraphUIData {
  topNodes: GraphNodeDisplay[];
  totalEntityCount: number;
  totalEdgeCount: number;
  computedAt: number;
}
