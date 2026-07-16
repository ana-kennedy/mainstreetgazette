// Phase 16 — Disney Graph Engine service
// Depends on:
//   Phase 2 (FeedItem.entityMatches) — entityId, entityName, parkId, locationId per item
//   Phase 3 (StoryCluster) — cluster.entities (names), cluster.parks, linking stories to entities
//   Phase 4 (ClassificationResult) — isOfficialAnnouncement, breakingScore for cluster summaries

import type { FeedItem } from "../../domain/models";
import type { StoryCluster } from "../../types/storyTypes";
import {
  MIN_EDGE_WEIGHT,
  ENTITY_PROFILE_CLUSTER_LIMIT,
  RELATED_ENTITIES_LIMIT,
  PARK_DISPLAY_NAMES,
} from "./rules";
import type {
  ClusterSummary,
  EntityGraph,
  EntityProfile,
  GraphEdge,
  GraphNode,
  RelatedEntityEntry,
} from "./types";

export interface GraphInput {
  clusters: StoryCluster[];
  feedItems?: FeedItem[];
}

// ── Build entity node index ───────────────────────────────────────────────────

function buildNodes(clusters: StoryCluster[], feedItems: FeedItem[]): Map<string, GraphNode> {
  const nodes = new Map<string, GraphNode>();

  // Harvest richer entity metadata (entityId, parkId) from FeedItem.entityMatches
  const entityIdMap = new Map<string, string>();    // name → id
  const entityParkMap = new Map<string, Set<string>>(); // name → parkIds
  const entityLocMap = new Map<string, Set<string>>();  // name → locationIds

  for (const item of feedItems) {
    if (!item.entityMatches) continue;
    for (const match of item.entityMatches) {
      const name = match.entityName;
      if (!entityIdMap.has(name) && match.entityId) entityIdMap.set(name, match.entityId);
      if (match.parkId) {
        if (!entityParkMap.has(name)) entityParkMap.set(name, new Set());
        entityParkMap.get(name)!.add(match.parkId);
      }
      if (match.locationId) {
        if (!entityLocMap.has(name)) entityLocMap.set(name, new Set());
        entityLocMap.get(name)!.add(match.locationId);
      }
    }
  }

  // Build nodes from clusters
  for (const cluster of clusters) {
    for (const entityName of cluster.entities) {
      let node = nodes.get(entityName);
      if (!node) {
        node = {
          entityName,
          entityId: entityIdMap.get(entityName),
          parkIds: Array.from(entityParkMap.get(entityName) ?? []),
          locationIds: Array.from(entityLocMap.get(entityName) ?? []),
          clusterIds: [],
        };
        nodes.set(entityName, node);
      }
      if (!node.clusterIds.includes(cluster.clusterId)) {
        node.clusterIds.push(cluster.clusterId);
      }
      // Also enrich park/location from cluster.parks if not already known
      for (const parkId of cluster.parks) {
        if (!node.parkIds.includes(parkId)) node.parkIds.push(parkId);
      }
    }
  }

  return nodes;
}

// ── Build co-mention edges ────────────────────────────────────────────────────

function buildEdges(clusters: StoryCluster[]): GraphEdge[] {
  // For every cluster mentioning 2+ entities, create co-mention edges
  const edgeMap = new Map<string, GraphEdge>();

  for (const cluster of clusters) {
    const entities = cluster.entities;
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i];
        const b = entities[j];
        // Canonical key: sort alphabetically so A→B and B→A are the same edge
        const key = [a, b].sort().join("||");
        const existing = edgeMap.get(key);
        if (existing) {
          existing.weight += 1;
          if (!existing.evidenceClusterIds.includes(cluster.clusterId)) {
            existing.evidenceClusterIds.push(cluster.clusterId);
          }
        } else {
          edgeMap.set(key, {
            fromEntity: a,
            toEntity: b,
            relationshipType: "related_to",
            weight: 1,
            evidenceClusterIds: [cluster.clusterId],
          });
        }
      }
    }
  }

  return Array.from(edgeMap.values()).filter((e) => e.weight >= 1);
}

// ── Build graph ───────────────────────────────────────────────────────────────

export function buildEntityGraph(input: GraphInput): EntityGraph {
  const { clusters, feedItems = [] } = input;
  const nodes = buildNodes(clusters, feedItems);
  const edges = buildEdges(clusters);
  return { nodes, edges, computedAt: Date.now() };
}

// ── Entity profile ────────────────────────────────────────────────────────────

function toClusterSummary(cluster: StoryCluster): ClusterSummary {
  return {
    clusterId: cluster.clusterId,
    primaryItemId: cluster.primaryItemId,
    headline: cluster.canonicalTitle,
    publishedAt: cluster.lastPublishedAt,
    sourceCount: cluster.sourceCount,
    isBreaking: cluster.breakingScore >= 70,
    isOfficial:
      cluster.officialSourcePresent ||
      (cluster.classification?.isOfficialAnnouncement ?? false),
  };
}

export function getEntityProfile(
  entityName: string,
  graph: EntityGraph,
  clusters: StoryCluster[],
): EntityProfile | null {
  const node = graph.nodes.get(entityName);
  if (!node) return null;

  // All clusters mentioning this entity, sorted newest-first
  const clusterMap = new Map(clusters.map((c) => [c.clusterId, c]));
  const entityClusters = node.clusterIds
    .map((id) => clusterMap.get(id))
    .filter((c): c is StoryCluster => c != null)
    .sort(
      (a, b) =>
        new Date(b.lastPublishedAt).getTime() - new Date(a.lastPublishedAt).getTime(),
    );

  const recentClusters: ClusterSummary[] = entityClusters
    .slice(0, ENTITY_PROFILE_CLUSTER_LIMIT)
    .map(toClusterSummary);

  // Related entities — neighbours in the co-mention graph, sorted by edge weight
  const relatedEntityEntries: RelatedEntityEntry[] = graph.edges
    .filter(
      (e) =>
        (e.fromEntity === entityName || e.toEntity === entityName) &&
        e.weight >= MIN_EDGE_WEIGHT,
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, RELATED_ENTITIES_LIMIT)
    .map((e) => {
      const otherName = e.fromEntity === entityName ? e.toEntity : e.fromEntity;
      const otherNode = graph.nodes.get(otherName);
      const parkLabel =
        otherNode?.parkIds
          .map((p) => PARK_DISPLAY_NAMES[p] ?? p)
          .join(", ") ?? "";
      return {
        entityName: otherName,
        entityId: otherNode?.entityId,
        relationshipType: e.relationshipType,
        sharedClusterCount: e.weight,
        parkIds: otherNode?.parkIds ?? [],
        accessibilityLabel: `${otherName}${parkLabel ? `, ${parkLabel}` : ""}. ${e.weight} shared ${e.weight === 1 ? "story" : "stories"}.`,
      };
    });

  const parkLabel = node.parkIds
    .map((p) => PARK_DISPLAY_NAMES[p] ?? p)
    .join(", ");

  return {
    entityName,
    entityId: node.entityId,
    parkIds: node.parkIds,
    totalClusterCount: node.clusterIds.length,
    recentClusters,
    relatedEntities: relatedEntityEntries,
    accessibilityLabel: `${entityName}${parkLabel ? `. ${parkLabel}` : ""}. ${node.clusterIds.length} stories.`,
  };
}
