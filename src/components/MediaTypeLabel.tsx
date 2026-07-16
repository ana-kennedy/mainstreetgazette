// Phase 01 (Gazette experience redesign) — text-first content-type indicator.
// Per ACCESSIBILITY_STANDARD.md: "Announce meaningful type/state in words" and
// "Do not redundantly announce both an icon and its text label" — the icon is
// decorative, the text is the source of truth for sighted and VoiceOver users alike.
import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ContentType } from "../domain/models";
import { Spacing, Typography } from "../theme/designTokens";

const ICONS: Record<ContentType, string> = {
  article: "text-box-outline",
  video: "play-circle-outline",
  podcast: "podcast",
  community: "account-group-outline",
};

interface MediaTypeLabelProps {
  type: ContentType;
}

export function MediaTypeLabel({ type }: MediaTypeLabelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons
        name={ICONS[type] as any}
        size={13}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[Typography.badge, { color: theme.colors.onSurfaceVariant }]}>
        {t(`contentType.${type}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs / 2,
  },
});
