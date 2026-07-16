import { buildEntityGraph } from "../phase16";
import type { GraphInput } from "../phase16/service";
import type { GraphNodeDisplay, GraphUIData } from "./types";

const TOP_NODES_LIMIT = 30;
const MIN_CLUSTER_COUNT = 1;

export function buildGraphUIData(input: GraphInput): GraphUIData {
  const graph = buildEntityGraph(input);
  const { nodes, edges } = graph;

  // Build edge count per entity
  const edgeCounts = new Map<string, number>();
  for (const edge of edges) {
    edgeCounts.set(edge.fromEntity, (edgeCounts.get(edge.fromEntity) ?? 0) + 1);
    edgeCounts.set(edge.toEntity, (edgeCounts.get(edge.toEntity) ?? 0) + 1);
  }

  const displayNodes: GraphNodeDisplay[] = [];

  for (const [entityName, node] of nodes.entries()) {
    if (node.clusterIds.length < MIN_CLUSTER_COUNT) continue;

    const clusterCount = node.clusterIds.length;
    const relatedEntityCount = edgeCounts.get(entityName) ?? 0;

    displayNodes.push({
      entityName,
      clusterCount,
      relatedEntityCount,
      parkIds: node.parkIds,
      accessibilityLabel: `${entityName}: ${clusterCount} ${clusterCount === 1 ? "story" : "stories"}, ${relatedEntityCount} connections.`,
    });
  }

  const sorted = displayNodes
    .sort((a, b) => {
      const scoreA = a.clusterCount * 2 + a.relatedEntityCount;
      const scoreB = b.clusterCount * 2 + b.relatedEntityCount;
      return scoreB - scoreA;
    })
    .slice(0, TOP_NODES_LIMIT);

  return {
    topNodes: sorted,
    totalEntityCount: nodes.size,
    totalEdgeCount: edges.length,
    computedAt: graph.computedAt,
  };
}
