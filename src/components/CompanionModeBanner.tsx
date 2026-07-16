// Phase 57 — Companion Mode Banner
// Displayed at the top of the Explore tab when an active park session is running.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useCompanionMode } from "../context/CompanionModeContext";

interface CompanionModeBannerProps {
  parkDisplayName: string;
}

export function CompanionModeBanner({ parkDisplayName }: CompanionModeBannerProps) {
  const theme = useTheme();
  const { isActive, endSession } = useCompanionMode();

  if (!isActive) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={"map-marker" as any}
        size={18}
        color={theme.colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View
        style={styles.textGroup}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Companion mode active. You're at ${parkDisplayName}.`}
      >
        <Text variant="labelMedium" style={[styles.label, { color: theme.colors.primary }]}>
          AT THE PARK
        </Text>
        <Text variant="bodyMedium" style={[styles.parkName, { color: theme.colors.onPrimaryContainer }]}>
          {parkDisplayName}
        </Text>
      </View>
      <Pressable
        onPress={endSession}
        style={({ pressed }) => [
          styles.endBtn,
          {
            backgroundColor: pressed ? theme.colors.primary : "transparent",
            borderColor: theme.colors.primary,
          },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="End companion session"
        accessibilityHint="Double tap to end your park visit mode."
      >
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.primary, fontWeight: "700" }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          END
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  textGroup: {
    flex: 1,
    gap: 1,
  },
  label: {
    letterSpacing: 0.6,
  },
  parkName: {
    fontWeight: "600",
  },
  endBtn: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
