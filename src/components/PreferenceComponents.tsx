// Shared UI primitives used across all Preferences screens (Phases 25–32).
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";
import { useSounds } from "../context/SoundContext";

// ── PrefSectionLabel ────────────────────────────────────────────────────────

export function PrefSectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

// ── PrefSwitchRow ───────────────────────────────────────────────────────────

export function PrefSwitchRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={[styles.switchRow, { borderColor: theme.colors.outline }]}
      onPress={() => onValueChange(!value)}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityValue={{ text: value ? "On" : "Off" }}
      accessibilityLabel={`${title}. ${value ? "On" : "Off"}.`}
      accessibilityHint={`Double tap to turn ${value ? "off" : "on"}. ${description}`}
      onAccessibilityTap={() => onValueChange(!value)}
    >
      <View style={styles.switchText}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        {description ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

// ── PrefChoiceRow ───────────────────────────────────────────────────────────

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel: string;
}

export function PrefChoiceRow<T extends string>({
  value,
  options,
  onValueChange,
}: {
  value: T;
  options: ChoiceOption<T>[];
  onValueChange: (v: T) => void;
}) {
  const theme = useTheme();
  const { playPickerTick } = useSounds();
  return (
    <View style={[styles.choiceRow, { borderColor: theme.colors.outline }]} accessible={false}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.choiceButton,
              {
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            onPress={() => { playPickerTick(); onValueChange(option.value); }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ selected: isSelected }}
            accessibilityHint={isSelected ? "Currently selected." : "Double tap to select."}
          >
            <Text
              style={{
                color: isSelected ? theme.colors.onPrimary : theme.colors.primary,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── PrefMultiChoiceRow ──────────────────────────────────────────────────────
// Same chip visual as PrefChoiceRow, but toggles membership in an array instead
// of picking one exclusive value (e.g. favorite topics, favorite parks).

export function PrefMultiChoiceRow<T extends string>({
  values,
  options,
  onToggle,
}: {
  values: T[];
  options: ChoiceOption<T>[];
  onToggle: (v: T) => void;
}) {
  const theme = useTheme();
  const { playPickerTick } = useSounds();
  return (
    <View style={[styles.choiceRow, { borderColor: theme.colors.outline }]} accessible={false}>
      {options.map((option) => {
        const isSelected = values.includes(option.value);
        return (
          <Pressable
            key={option.value}
            style={[
              styles.choiceButton,
              {
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            onPress={() => { playPickerTick(); onToggle(option.value); }}
            accessible
            accessibilityRole="checkbox"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ checked: isSelected }}
            accessibilityHint={isSelected ? "Double tap to remove." : "Double tap to add."}
          >
            <Text
              style={{
                color: isSelected ? theme.colors.onPrimary : theme.colors.primary,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── PrefChoiceLabel ─────────────────────────────────────────────────────────

export function PrefChoiceLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      variant="bodyLarge"
      style={[styles.choiceLabel, { color: theme.colors.onSurface }]}
    >
      {children}
    </Text>
  );
}

// ── PrefNavRow (small, within a sub-screen) ─────────────────────────────────

export function PrefNavRow({
  label,
  icon,
  hint,
  onPress,
}: {
  label: string;
  icon: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={theme.colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[styles.navRowText, { color: theme.colors.onSurface }]}>{label}</Text>
      <MaterialCommunityIcons
        name={"chevron-right" as any}
        size={18}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

// ── PrefNavCard (hub cards on the Preferences home screen) ──────────────────

export function PrefNavCard({
  title,
  subtitle,
  icon,
  hint,
  onPress,
  badge,
}: {
  title: string;
  subtitle: string;
  icon: string;
  hint: string;
  onPress: () => void;
  badge?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navCard,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}.`}
      accessibilityHint={hint}
    >
      <View
        style={[styles.navCardIcon, { backgroundColor: theme.colors.primaryContainer }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={theme.colors.onPrimaryContainer}
        />
      </View>
      <View style={styles.navCardText}>
        <Text
          variant="titleSmall"
          style={[styles.navCardTitle, { color: theme.colors.onSurface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {title}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {subtitle}
        </Text>
      </View>
      {badge != null && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
          <Text style={[styles.badgeText, { color: theme.colors.onError }]}>{badge}</Text>
        </View>
      ) : null}
      <MaterialCommunityIcons
        name={"chevron-right" as any}
        size={18}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

// ── PrefScreen wrapper (scrollable content area) ─────────────────────────────

export function PrefGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
  },
  switchRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
  },
  switchText: {
    flex: 1,
    gap: 4,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: "hidden",
  },
  choiceButton: {
    minHeight: 44,
    minWidth: 80,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  choiceLabel: {
    marginTop: 4,
    marginBottom: 2,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 50,
  },
  navRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 64,
  },
  navCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  navCardText: {
    flex: 1,
    gap: 2,
  },
  navCardTitle: {
    fontWeight: "600",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  group: {
    gap: 8,
  },
});
