// Phase 73 — What's New: highlights screen shown after version updates.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { RELEASE_NOTES, getLatestReleaseNote } from "../data/releaseNotes";
import type { SettingsStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<SettingsStackParamList, "WhatsNew">;

export function WhatsNewScreen({ navigation }: Props) {
  const theme = useTheme();
  const latest = getLatestReleaseNote();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header} accessible accessibilityRole="header">
          <Text variant="headlineLarge" style={[styles.version, { color: theme.colors.primary }]}>
            {latest.version}
          </Text>
          <Text variant="headlineSmall" style={[styles.headline, { color: theme.colors.onSurface }]}>
            {latest.headline}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Released {new Date(latest.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </Text>
          {latest.isAccessibilityFocused ? (
            <View style={[styles.a11yBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name={"human" as any}
                size={14}
                color={theme.colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "700" }}>
                ACCESSIBILITY FOCUS
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.highlights}>
          {latest.highlights.map((h, idx) => (
            <View
              key={idx}
              style={[styles.highlightCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
              accessible
              accessibilityLabel={`${h.title}. ${h.description}`}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <MaterialCommunityIcons
                  name={h.icon as any}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.highlightText} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text variant="titleSmall" style={[styles.highlightTitle, { color: theme.colors.onSurface }]}>
                  {h.title}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
                  {h.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {RELEASE_NOTES.length > 1 ? (
          <>
            <Text
              variant="titleSmall"
              style={[styles.prevHeader, { color: theme.colors.onSurfaceVariant }]}
              accessibilityRole="header"
            >
              PREVIOUS RELEASES
            </Text>
            {RELEASE_NOTES.slice(1).map((rn) => (
              <View
                key={rn.version}
                style={[styles.prevRow, { borderColor: theme.colors.outlineVariant }]}
                accessible
                accessibilityLabel={`Version ${rn.version}. ${rn.headline}. Released ${rn.date}.`}
              >
                <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: "700" }}>
                  {rn.version}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {rn.headline}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.doneBtn}
          accessibilityLabel="Done, close What's New"
          accessibilityRole="button"
        >
          Done
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  header: {
    gap: 6,
    paddingBottom: 8,
  },
  version: {
    fontWeight: "900",
    letterSpacing: -1,
  },
  headline: {
    fontWeight: "700",
  },
  a11yBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  highlights: {
    gap: 10,
  },
  highlightCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 14,
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  highlightText: {
    flex: 1,
    gap: 3,
  },
  highlightTitle: {
    fontWeight: "700",
  },
  prevHeader: {
    letterSpacing: 0.8,
    fontWeight: "700",
    marginTop: 8,
  },
  prevRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    marginTop: 8,
  },
});
