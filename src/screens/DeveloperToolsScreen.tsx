// Phase 07 — hidden developer area. Reuses the diagnostics/AI-toggle content from the
// retired AdvancedAboutScreen and re-parents SourceLibrary/SourceManage/Analytics here
// instead of normal Settings, per the spec's "Important removals": no normal-user
// Source Library, RSS management, analytics, feature flags, cache duration, or developer
// diagnostics. Reached only via the hidden unlock in AboutGazetteScreen (tap the version
// number 7 times) — never linked from the regular Settings home.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { NativeModules, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { PrefGroup, PrefNavRow, PrefSectionLabel, PrefSwitchRow } from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useSounds } from "../context/SoundContext";
import { runLaunchValidation, type LaunchReport } from "../services/launchValidation";
import type { SettingsStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

export function DeveloperToolsScreen() {
  const app = useAppContext();
  const navigation = useNavigation<Nav>();
  const { playConfirm } = useSounds();
  const { showToast } = useToast();
  const theme = useTheme();
  const settings = app.settings;
  const [launchReport, setLaunchReport] = useState<LaunchReport | null>(null);

  if (!settings) return null;

  const update = (patch: Partial<typeof settings>) => {
    playConfirm();
    app.updateSettings({ ...settings, ...patch });
  };

  const handleRebuildIndex = async () => {
    await app.clearCache();
    app.refresh();
    showToast("Feed index rebuilt.", "success");
  };

  const handleRunLaunchValidation = () => {
    playConfirm();
    const sourceMap = new Map(app.sources.map((s) => [s.id, s]));
    const report = runLaunchValidation(sourceMap, settings, app.items.length);
    setLaunchReport(report);
    showToast(report.isReady ? "Launch validation passed." : `Launch validation: ${report.failCount} issue(s).`, report.isReady ? "success" : "error");
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant="bodySmall"
          style={[styles.warning, { color: theme.colors.error }]}
          accessibilityRole="text"
        >
          Developer Tools — not part of the normal Gazette experience.
        </Text>

        <PrefSectionLabel>Sources</PrefSectionLabel>
        <PrefGroup>
          <PrefNavRow
            label="Source Library"
            icon="rss"
            hint="Double tap to browse and manage the full source catalog."
            onPress={() => {
              playConfirm();
              navigation.navigate("SourceLibrary");
            }}
          />
          <PrefNavRow
            label="Manage Sources"
            icon="cog-outline"
            hint="Double tap to enable or disable individual sources."
            onPress={() => {
              playConfirm();
              navigation.navigate("SourceManage");
            }}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Diagnostics</PrefSectionLabel>
        <PrefGroup>
          <PrefNavRow
            label="Feed Health"
            icon="chart-bar"
            hint="Double tap to view feed source health and coverage metrics."
            onPress={() => {
              playConfirm();
              navigation.navigate("Analytics");
            }}
          />
          <PrefNavRow
            label="Rebuild Feed Index"
            icon="refresh"
            hint="Double tap to clear the cache and re-fetch all sources."
            onPress={handleRebuildIndex}
          />
          <PrefNavRow
            label="Run Launch Validation"
            icon="clipboard-check-outline"
            hint="Double tap to check pre-launch readiness: sources, cached content, and settings."
            onPress={handleRunLaunchValidation}
          />
        </PrefGroup>

        {launchReport ? (
          <View style={[styles.reportCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {launchReport.results.map((r) => (
              <Text
                key={r.id}
                style={[
                  styles.reportRow,
                  { color: r.severity === "fail" ? theme.colors.error : r.severity === "warn" ? theme.colors.tertiary ?? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                ]}
              >
                {r.severity === "pass" ? "✓" : r.severity === "warn" ? "⚠" : "✗"} {r.label}
                {r.detail ? ` — ${r.detail}` : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {Platform.OS === "ios" &&
          (!!NativeModules.MGFoundationModels || !!NativeModules.MGTranslation) ? (
          <>
            <Divider style={styles.divider} />
            <PrefSectionLabel>Apple Intelligence</PrefSectionLabel>
            <PrefGroup>
              {!!NativeModules.MGFoundationModels ? (
                <PrefSwitchRow
                  title="AI Article Summaries"
                  description="Use on-device Apple Intelligence to summarize long articles."
                  value={settings.aiSummariesEnabled}
                  onValueChange={(v) => update({ aiSummariesEnabled: v })}
                />
              ) : null}
              {!!NativeModules.MGTranslation ? (
                <PrefSwitchRow
                  title="Article Translation"
                  description="Translate articles from other languages using on-device models."
                  value={settings.translateArticlesEnabled}
                  onValueChange={(v) => update({ translateArticlesEnabled: v })}
                />
              ) : null}
            </PrefGroup>
          </>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  warning: {
    fontWeight: "700",
    marginBottom: 4,
  },
  divider: {
    marginVertical: 8,
  },
  reportCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  reportRow: {
    fontSize: 13,
    lineHeight: 18,
  },
});
