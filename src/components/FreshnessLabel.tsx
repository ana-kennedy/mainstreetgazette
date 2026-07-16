// Phase 01 (Gazette experience redesign) — Constitution rule 11: "Trust is
// visible. Identify live, recently updated, estimated, planning-guide, editorial,
// official, and independent information." Approved wording lives in
// temp/08_COPY_AND_CONTENT/APP_COPY_REFERENCE.md — do not invent new trust wording
// elsewhere; add a new FreshnessKind here instead.
import React from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Typography } from "../theme/designTokens";

export type FreshnessKind =
  | "live"
  | "updatedRecently"
  | "estimated"
  | "planningGuide"
  | "official"
  | "independent"
  | "estimate";

interface FreshnessLabelProps {
  kind: FreshnessKind;
}

export function FreshnessLabel({ kind }: FreshnessLabelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isLive = kind === "live";
  return (
    <Text
      style={[
        Typography.badge,
        styles.label,
        { color: isLive ? theme.colors.error : theme.colors.onSurfaceVariant },
      ]}
    >
      {t(`trust.${kind}`)}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    textTransform: "uppercase",
  },
});
