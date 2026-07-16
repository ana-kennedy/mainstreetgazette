import React, { useMemo, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export type AdaptiveSelectorOption<T extends string = string> = {
  label: string;
  value: T;
  brailleLabel?: string;
  groupLabel?: string;
};

type Props<T extends string = string> = {
  label: string;
  value: T;
  options: readonly AdaptiveSelectorOption<T>[];
  onChange: (value: T) => void;
  screenReaderOptimized?: boolean;
  announceChange?: (value: T) => string;
};

export function AccessibleAdaptiveSelector<T extends string = string>({
  label,
  value,
  options,
  onChange,
  screenReaderOptimized = false,
  announceChange,
}: Props<T>) {
  const theme = useTheme();
  const [listVisible, setListVisible] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((item) => item.value === value));
  const selected = options[selectedIndex] ?? options[0];

  const accessibilityLabel = useMemo(() => {
    const concise = selected?.brailleLabel ?? selected?.label ?? value;
    const grouped = selected?.groupLabel ? `${selected.groupLabel}: ${concise}` : concise;
    return `${label}. ${grouped}.`;
  }, [label, selected, value]);

  const changeTo = (next: AdaptiveSelectorOption<T>) => {
    if (!next || next.value === value) return;
    onChange(next.value);
    const announceLabel = next.groupLabel ? `${next.groupLabel}: ${next.label}` : next.label;
    AccessibilityInfo.announceForAccessibility(
      announceChange ? announceChange(next.value) : `${label}: ${announceLabel}`
    );
  };

  const changeBy = (delta: number) => {
    if (!options.length) return;
    const nextIndex = Math.min(options.length - 1, Math.max(0, selectedIndex + delta));
    const next = options[nextIndex];
    if (next) changeTo(next);
  };

  if (screenReaderOptimized) {
    return (
      <>
        <Pressable
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Swipe up or down to change. Double tap to see all options."
          accessibilityValue={{ text: selected?.label ?? value }}
          accessibilityActions={[
            { name: "increment", label: "Next" },
            { name: "decrement", label: "Previous" },
            { name: "activate", label: "Show all options" },
          ]}
          onAccessibilityAction={({ nativeEvent: { actionName } }) => {
            if (actionName === "increment") changeBy(1);
            if (actionName === "decrement") changeBy(-1);
            if (actionName === "activate") setListVisible(true);
          }}
          onPress={() => setListVisible(true)}
          style={({ pressed }) => [
            styles.adjustable,
            {
              borderColor: theme.colors.outline,
              backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
            },
          ]}
        >
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {selected?.label ?? value}
          </Text>
        </Pressable>

        <Modal
          visible={listVisible}
          animationType="slide"
          onRequestClose={() => setListVisible(false)}
          statusBarTranslucent
        >
          <View
            style={[styles.modalScreen, { backgroundColor: theme.colors.background }]}
            accessibilityViewIsModal
          >
            <View style={[styles.modalNavBar, { borderBottomColor: theme.colors.outline }]}>
              <Pressable
                onPress={() => setListVisible(false)}
                style={({ pressed }) => [styles.modalCloseSlot, { opacity: pressed ? 0.55 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Close"
                accessibilityHint="Double tap to close without changing the selection."
              >
                <Text style={{ color: theme.colors.primary }}>Close</Text>
              </Pressable>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onBackground }}
                accessibilityRole="header"
                numberOfLines={1}
              >
                {label}
              </Text>
              <View style={styles.modalCloseSlot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {options.map((option, index) => {
                const active = option.value === value;
                const showGroupHeader = Boolean(option.groupLabel) && option.groupLabel !== options[index - 1]?.groupLabel;
                return (
                  <React.Fragment key={option.value}>
                    {showGroupHeader ? (
                      <Text
                        style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {option.groupLabel}
                      </Text>
                    ) : null}
                    <Pressable
                      accessible
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${option.groupLabel ? `${option.groupLabel}, ` : ""}${option.label}${active ? ", selected" : ""}`}
                      accessibilityHint={`Double tap to show ${option.label}.`}
                      onPress={() => {
                        changeTo(option);
                        setListVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.modalRow,
                        {
                          backgroundColor: active
                            ? theme.colors.primaryContainer
                            : pressed
                              ? theme.colors.surfaceVariant
                              : theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View style={styles.chips}>
      {options.map((option, index) => {
        const active = option.value === value;
        const showGroupHeader = Boolean(option.groupLabel) && option.groupLabel !== options[index - 1]?.groupLabel;
        return (
          <React.Fragment key={option.value}>
            {showGroupHeader ? (
              <Text
                style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {option.groupLabel}
              </Text>
            ) : null}
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.groupLabel ? `${option.groupLabel}, ` : ""}${option.label}${active ? ", selected" : ""}`}
              accessibilityHint={`Double tap to show ${option.label}.`}
              onPress={() => changeTo(option)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: active ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: active
                    ? theme.colors.primaryContainer
                    : pressed
                      ? theme.colors.surfaceVariant
                      : theme.colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                {option.label}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  adjustable: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  groupHeader: {
    width: "100%",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  chip: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScreen: {
    flex: 1,
  },
  modalNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseSlot: {
    minWidth: 56,
  },
  modalList: {
    padding: 16,
    gap: 8,
  },
  modalRow: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
});
