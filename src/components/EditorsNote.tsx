// Phase 01 (Gazette experience redesign) — editorial callout, approved copy
// "Editor's Note" per temp/08_COPY_AND_CONTENT/APP_COPY_REFERENCE.md.
import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, useTheme } from "react-native-paper";
import { Border, Radius, Spacing, Typography } from "../theme/designTokens";

interface EditorsNoteProps {
  children: React.ReactNode;
}

export function EditorsNote({ children }: EditorsNoteProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={styles.labelRow}>
        <MaterialCommunityIcons
          name="feather"
          size={14}
          color={theme.colors.onPrimaryContainer}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text
          style={[Typography.sectionHeader, { color: theme.colors.onPrimaryContainer }]}
          accessibilityRole="header"
        >
          Editor's Note
        </Text>
      </View>
      <Text style={[Typography.description, { color: theme.colors.onPrimaryContainer }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: Border.thin,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
});
