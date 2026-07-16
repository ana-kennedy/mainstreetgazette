import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppContext } from "../context/AppContext";
import { buildContentAnalytics } from "../intelligence/phase15";
import type { SourceHealthStat, SourceHealthStatus } from "../intelligence/phase15";
import { buildFeedFetchQueue } from "../intelligence/phase39";

// ── Status helpers ────────────────────────────────────────────────────────────

function statusIcon(status: SourceHealthStatus): string {
  switch (status) {
    case "healthy": return "check-circle-outline";
    case "slow": return "clock-alert-outline";
    case "failing": return "alert-circle-outline";
    case "silent": return "minus-circle-outline";
  }
}

function useStatusColor(status: SourceHealthStatus): string {
  const theme = useTheme();
  switch (status) {
    case "healthy": return (theme.colors as unknown as Record<string, string>)["tertiary"] ?? theme.colors.primary;
    case "slow": return (theme.colors as unknown as Record<string, string>)["secondary"] ?? theme.colors.primary;
    case "failing": return theme.colors.error;
    case "silent": return theme.colors.onSurfaceVariant;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Text
      variant="titleSmall"
      style={[styles.sectionHeader, { color: theme.colors.primary }]}
      accessibilityRole="header"
    >
      {label.toUpperCase()}
    </Text>
  );
}

function StatRow({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon?: string;
  iconColor?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={styles.statRow}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon as any}
          size={16}
          color={iconColor ?? theme.colors.onSurfaceVariant}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      <Text variant="bodyMedium" style={[styles.statLabel, { color: theme.colors.onSurface }]}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
        {value}
      </Text>
    </View>
  );
}

function SourceRow({ stat }: { stat: SourceHealthStat }) {
  const theme = useTheme();
  const color = useStatusColor(stat.status);
  const icon = statusIcon(stat.status);

  return (
    <View
      style={styles.sourceRow}
      accessible
      accessibilityLabel={`${stat.sourceName}. ${stat.status}. ${stat.itemsLast24h} items in the last 24 hours.${stat.lastErrorMessage ? ` Error: ${stat.lastErrorMessage}` : ""}`}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={16}
        color={color}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.sourceRowText}>
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={[styles.sourceName, { color: theme.colors.onSurface }]}
        >
          {stat.sourceName}
        </Text>
        {stat.lastErrorMessage ? (
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.error }}
          >
            {stat.lastErrorMessage}
          </Text>
        ) : null}
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {stat.itemsLast24h}
        <Text style={{ color: theme.colors.onSurfaceVariant }}> / 24h</Text>
      </Text>
    </View>
  );
}

function CoverageIndicator({ hasCoverage, count }: { hasCoverage: boolean; count: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.coveragePill, {
      backgroundColor: hasCoverage ? theme.colors.primaryContainer : theme.colors.errorContainer,
    }]}>
      <Text style={[styles.coveragePillText, {
        color: hasCoverage ? theme.colors.onPrimaryContainer : theme.colors.onErrorContainer,
      }]}>
        {hasCoverage ? `${count}` : "0"}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AnalyticsScreen() {
  const app = useAppContext();
  const theme = useTheme();

  const analytics = useMemo(
    () =>
      buildContentAnalytics({
        feedItems: app.items,
        sources: app.sources,
        clusters: app.clusters,
      }),
    [app.items, app.sources, app.clusters],
  );

  const { feedQuality, duplicateMetrics, coverageGaps, topSourcesByVolume, sourceHealth } =
    analytics;

  const failingSources = sourceHealth.filter((s) => s.status === "failing");
  const silentSources = sourceHealth.filter((s) => s.status === "silent");

  const fetchIntelligence = useMemo(
    () =>
      buildFeedFetchQueue({
        sources: app.sources,
        metas: app.sourceMeta,
        cycleStartMs: Date.now(),
      }),
    [app.sources, app.sourceMeta],
  );

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of fetchIntelligence.queue) {
      if (!r.skip) counts[r.priority] = (counts[r.priority] ?? 0) + 1;
    }
    return counts;
  }, [fetchIntelligence.queue]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Feed health dashboard"
    >
      <Text
        variant="headlineMedium"
        style={[styles.pageTitle, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        Feed Health
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
        All metrics are computed locally from your cached feed. No data leaves your device.
      </Text>

      {/* ── Feed overview ── */}
      <SectionHeader label="Feed Overview" />
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <StatRow label="Active sources" value={String(feedQuality.activeSources)} icon="check-circle-outline" iconColor={theme.colors.primary} />
        <StatRow label="Total sources" value={String(feedQuality.totalSources)} />
        <StatRow label="Failing sources" value={String(feedQuality.failingSources)} icon="alert-circle-outline" iconColor={feedQuality.failingSources > 0 ? theme.colors.error : theme.colors.onSurfaceVariant} />
        <StatRow label="Silent sources" value={String(feedQuality.silentSources)} />
        <Divider style={{ marginVertical: 6 }} />
        <StatRow label="Total cached items" value={String(feedQuality.totalItems)} />
        <StatRow label="Video items" value={String(feedQuality.videoItems)} icon="youtube" />
        <StatRow label="Podcast items" value={String(feedQuality.podcastItems)} icon="podcast" />
        <StatRow label="Official items" value={String(feedQuality.officialItems)} icon="star-outline" />
        <StatRow label="Breaking clusters" value={String(feedQuality.breakingItems)} />
      </View>

      {/* ── Cluster / dedup metrics ── */}
      <SectionHeader label="Story Clustering" />
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <StatRow label="Story clusters" value={String(duplicateMetrics.clusterCount)} />
        <StatRow label="Avg items per cluster" value={String(duplicateMetrics.avgItemsPerCluster)} />
        <StatRow label="Singleton clusters" value={String(duplicateMetrics.singletonClusters)} />
        <StatRow
          label="Merge rate"
          value={`${Math.round(duplicateMetrics.mergeRate * 100)}%`}
          icon="merge"
        />
        <StatRow label="Social posts" value={String(duplicateMetrics.socialPostCount)} />
        <StatRow label="Est. social deduplicated" value={String(duplicateMetrics.socialDedupeCount)} />
      </View>

      {/* ── Coverage gaps ── */}
      <SectionHeader label="Coverage by Location (last 24h)" />
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        {coverageGaps.map((gap) => (
          <View
            key={gap.locationId}
            style={styles.coverageRow}
            accessible
            accessibilityLabel={`${gap.locationLabel}: ${gap.hasCoverage ? `${gap.clustersLast24h} clusters` : "no coverage"}`}
          >
            <Text
              variant="bodyMedium"
              style={[styles.coverageLabel, { color: theme.colors.onSurface }]}
            >
              {gap.locationLabel}
            </Text>
            <CoverageIndicator hasCoverage={gap.hasCoverage} count={gap.clustersLast24h} />
          </View>
        ))}
      </View>

      {/* ── Failing / silent sources ── */}
      {failingSources.length > 0 ? (
        <>
          <SectionHeader label="Failing Sources" />
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            {failingSources.map((s) => (
              <SourceRow key={s.sourceId} stat={s} />
            ))}
          </View>
        </>
      ) : null}

      {silentSources.length > 0 ? (
        <>
          <SectionHeader label="Silent Sources (48h+)" />
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            {silentSources.map((s) => (
              <SourceRow key={s.sourceId} stat={s} />
            ))}
          </View>
        </>
      ) : null}

      {/* ── Top sources by volume ── */}
      <SectionHeader label="Top Sources by Volume" />
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        {topSourcesByVolume.map((s) => (
          <SourceRow key={s.sourceId} stat={s} />
        ))}
      </View>

      {/* ── Feed intelligence queue ── */}
      <SectionHeader label="Feed Priority Queue" />
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
        accessible
        accessibilityLabel={`Feed priority queue. ${fetchIntelligence.urgentCount} urgent sources, ${fetchIntelligence.skippedCount} skipped.`}
      >
        <StatRow
          label="Queued this cycle"
          value={String(fetchIntelligence.queue.length - fetchIntelligence.skippedCount)}
          icon="clock-fast"
        />
        <StatRow label="Skipped (backoff)" value={String(fetchIntelligence.skippedCount)} />
        <StatRow label="Critical / Official" value={String(priorityCounts["critical"] ?? 0)} icon="star-outline" iconColor={theme.colors.primary} />
        <StatRow label="High priority" value={String(priorityCounts["high"] ?? 0)} />
        <StatRow label="Normal priority" value={String(priorityCounts["normal"] ?? 0)} />
        <StatRow label="Low priority" value={String(priorityCounts["low"] ?? 0)} />
      </View>

      {app.lastRefreshAt ? (
        <>
          <SectionHeader label="Last Refresh" />
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <StatRow label="Completed" value={app.lastRefreshAt.toLocaleTimeString()} icon="check-circle-outline" />
            {app.lastRefreshSummary ? (
              <StatRow label="Summary" value={app.lastRefreshSummary} />
            ) : null}
          </View>
        </>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  pageTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionHeader: {
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  statLabel: {
    flex: 1,
  },
  statValue: {
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  sourceRowText: {
    flex: 1,
    gap: 1,
  },
  sourceName: {
    fontWeight: "500",
  },
  coverageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  coverageLabel: {
    flex: 1,
  },
  coveragePill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: "center",
  },
  coveragePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
