// Phase 07 — "About the Gazette" Settings group (rebuild of the legacy
// AdvancedAboutScreen, minus its Diagnostics and Apple Intelligence sections — those
// moved to DeveloperToolsScreen behind the developer unlock). Data Sources content
// below is grounded in what the app actually calls: themeparks.wiki (an independent,
// community-run API — NOT Disney) for park hours/wait times, Open-Meteo for forecasts,
// and the US National Weather Service for weather alerts (see services/parksService.ts
// and services/weatherService.ts). Terms of Service text, Credits/team names, and the
// open-source notices are placeholder copy — flagged in PHASE_07_RESULTS.md for real
// content, not fabricated as if final.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Linking, Platform, Pressable, Share, ScrollView, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";
import { Screen } from "../components/Screen";
import { PrefGroup, PrefNavRow, PrefSectionLabel } from "../components/PreferenceComponents";
import { useSounds } from "../context/SoundContext";
import { useNavigation } from "@react-navigation/native";

const PRIVACY_POLICY_URL = "https://ana-kennedy.github.io/mainstreetgazette/privacy-policy/";
const SUPPORT_URL = "https://ana-kennedy.github.io/mainstreetgazette/support/";

let appVersion = "1.0";
let buildNumber = "";
try {
  const Constants = require("expo-constants").default;
  appVersion = Constants.expoConfig?.version ?? Constants.manifest?.version ?? "1.0";
  buildNumber = Constants.expoConfig?.ios?.buildNumber ?? Constants.manifest?.ios?.buildNumber ?? "";
} catch {}

function ExpandableCard({ title, icon, body }: { title: string; icon: string; body: string }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      accessible
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${title}. ${expanded ? body : ""}`}
      accessibilityHint={expanded ? "Double tap to collapse." : "Double tap to expand."}
    >
      <View style={styles.expandableHeader} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} />
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "600", flex: 1 }}>{title}</Text>
        <MaterialCommunityIcons name={(expanded ? "chevron-up" : "chevron-down") as any} size={18} color={theme.colors.onSurfaceVariant} />
      </View>
      {expanded ? (
        <Text
          variant="bodySmall"
          style={[styles.aboutDesc, { color: theme.colors.onSurfaceVariant }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {body}
        </Text>
      ) : null}
    </Pressable>
  );
}

// Tap "This Edition" this many times in a row (within UNLOCK_WINDOW_MS of each other)
// to reveal Developer Tools — an intentional, undiscoverable-by-accident unlock rather
// than a visible normal-Settings entry, per the spec's "Important removals."
const UNLOCK_TAP_COUNT = 7;
const UNLOCK_WINDOW_MS = 2000;

export function AboutGazetteScreen() {
  const { playConfirm } = useSounds();
  const theme = useTheme();
  const navigation = useNavigation();
  const [tapCount, setTapCount] = useState(0);
  const lastTapRef = React.useRef(0);

  const handleShare = () => {
    playConfirm();
    Share.share(
      Platform.OS === "ios"
        ? { url: SUPPORT_URL, title: "Main Street Gazette" }
        : { message: `Main Street Gazette — ${SUPPORT_URL}`, title: "Main Street Gazette" }
    );
  };

  const handleEditionTap = () => {
    const now = Date.now();
    const withinWindow = now - lastTapRef.current < UNLOCK_WINDOW_MS;
    lastTapRef.current = now;
    const next = withinWindow ? tapCount + 1 : 1;
    setTapCount(next);
    if (next >= UNLOCK_TAP_COUNT) {
      setTapCount(0);
      playConfirm();
      (navigation as any).navigate("DeveloperTools");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.pageTitle} accessibilityRole="header">
          About the Gazette
        </Text>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Discover the story, sources, and people behind Main Street Gazette.
        </Text>

        <PrefSectionLabel>This Edition</PrefSectionLabel>
        <Pressable
          onPress={handleEditionTap}
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Main Street Gazette version ${appVersion}${buildNumber ? `, build ${buildNumber}` : ""}.`}
        >
          <Text variant="titleMedium" style={[styles.appName, { color: theme.colors.onSurface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Main Street Gazette
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Version {appVersion}{buildNumber ? ` (build ${buildNumber})` : ""}
          </Text>
        </Pressable>
        <PrefGroup>
          <PrefNavRow
            label="What's New in This Edition"
            icon="star-shooting-outline"
            hint="Double tap to see recent updates and highlights."
            onPress={() => {
              playConfirm();
              (navigation as any).navigate("WhatsNew");
            }}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Data Sources</PrefSectionLabel>
        <Text style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
          Official, independent, and estimated information is always labeled honestly —
          here's where each kind of information comes from.
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <SourceRow icon="map-marker-radius-outline" label="Park Information" desc="Park hours, wait times, and schedules come from themeparks.wiki, an independent, community-run source — not an official Disney feed." />
          <Divider />
          <SourceRow icon="weather-partly-cloudy" label="Weather" desc="Forecasts are estimated from Open-Meteo. Severe weather alerts (U.S. parks only) come from the National Weather Service, an official U.S. government source." />
          <Divider />
          <SourceRow icon="clock-outline" label="Planning Estimates" desc="Wait time and crowd estimates are informational only, not an official Disney guarantee." />
          <Divider />
          <SourceRow icon="radio" label="Park Radio" desc="Not yet available in this edition." />
          <Divider />
          <SourceRow icon="newspaper-variant-outline" label="News Publishers" desc="Articles, videos, and podcasts come from the independent and official Disney news sources you've enabled." />
        </View>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Privacy</PrefSectionLabel>
        <View
          style={[styles.infoBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel="Main Street Gazette does not collect analytics, track your reading, or share data with third parties. All intelligence features run locally on your device."
        >
          <MaterialCommunityIcons name={"shield-check-outline" as any} size={18} color={theme.colors.primary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text variant="bodySmall" style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Main Street Gazette does not collect analytics, track your reading, or share data with third parties. All intelligence features run locally on your device.
          </Text>
        </View>
        <PrefGroup>
          <PrefNavRow label="Privacy Policy" icon="open-in-new" hint="Double tap to open the privacy policy in your browser." onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
        </PrefGroup>
        <ExpandableCard
          title="Terms of Use"
          icon="file-document-outline"
          body="Full terms of use are being finalized for a future edition. In the meantime, Main Street Gazette is provided as-is, for informational purposes, by an independent Disney fan project."
        />

        <Divider style={styles.divider} />

        <PrefSectionLabel>Credits</PrefSectionLabel>
        <ExpandableCard
          title="Meet the Team"
          icon="account-group-outline"
          body="Main Street Gazette is built and maintained by an independent team of Disney parks fans. Full credits are being prepared for a future edition."
        />
        <ExpandableCard
          title="Open-Source Software"
          icon="code-tags"
          body="Main Street Gazette is built with Expo, React Native, and other open-source software. A full list of acknowledgements is being prepared for a future edition."
        />

        <Divider style={styles.divider} />

        <PrefSectionLabel>Legal</PrefSectionLabel>
        <ExpandableCard
          title="Accessibility Statement"
          icon="human"
          body="Main Street Gazette is designed to work with VoiceOver, Dynamic Type, and other iOS accessibility features. A full accessibility statement is being prepared for a future edition. Found an issue? Use Support & Feedback below."
        />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text variant="bodySmall" style={[styles.aboutDesc, { color: theme.colors.onSurfaceVariant }]}>
            Not affiliated with or endorsed by The Walt Disney Company. All Disney marks and
            images are property of their respective owners.
          </Text>
        </View>
        <PrefGroup>
          <PrefNavRow label="Open-Source Software" icon="code-tags" hint="Double tap to view open-source acknowledgements." onPress={() => {}} />
          <PrefNavRow label="Accessibility Statement" icon="human" hint="Double tap to view our accessibility commitment." onPress={() => {}} />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefGroup>
          <PrefNavRow label="Support & Feedback" icon="lifebuoy" hint="Double tap to open the support page." onPress={() => Linking.openURL(SUPPORT_URL)} />
          <PrefNavRow label="Share the Gazette" icon="share-variant-outline" hint="Double tap to share Main Street Gazette." onPress={handleShare} />
        </PrefGroup>

        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

function SourceRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sourceRow} accessible accessibilityLabel={`${label}. ${desc}`}>
      <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: "600" }}>{label}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  pageTitle: {
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  intro: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 8,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  appName: {
    fontWeight: "700",
  },
  expandableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  aboutDesc: {
    lineHeight: 18,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
});
