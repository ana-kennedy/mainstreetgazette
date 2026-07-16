// Phase 01 (Gazette experience redesign) — shared root-tab header.
// Standardizes the gear button that was previously duplicated with inconsistent
// copy across NewsScreen, DiscoverScreen, and ForYouScreen (see PHASE_01_RESULTS.md).
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Spacing, Typography } from "../theme/designTokens";

interface SettingsGearButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** The one gear button every root tab uses to reach Your Gazette settings. */
export function SettingsGearButton({ onPress, style }: SettingsGearButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <IconButton
      icon="cog-outline"
      mode="outlined"
      onPress={onPress}
      iconColor={theme.colors.primary}
      style={style}
      accessibilityLabel={t("gazetteHeader.settingsLabel")}
      accessibilityRole="button"
      accessibilityHint={t("gazetteHeader.settingsHint")}
    />
  );
}

interface GazettePageHeaderProps {
  title: string;
  onOpenSettings: () => void;
  /** Extra header controls (search, refresh, etc.) rendered between the title and gear button. */
  rightAccessory?: React.ReactNode;
}

export function GazettePageHeader({ title, onOpenSettings, rightAccessory }: GazettePageHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text
        style={[Typography.pageTitle, styles.title, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {rightAccessory}
      <SettingsGearButton onPress={onOpenSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  title: {
    flex: 1,
  },
});
