import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { SearchQuickFilter } from "../search/searchTypes";

export interface SearchFilterChip {
  id: SearchQuickFilter;
  label: string;
}

interface SearchFilterBarProps {
  filters: SearchFilterChip[];
  selectedFilter: SearchQuickFilter;
  onChange: (filter: SearchQuickFilter) => void;
}

export function SearchFilterBar({ filters, selectedFilter, onChange }: SearchFilterBarProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="tablist"
      accessibilityLabel="Search filters"
    >
      {filters.map((chip) => {
        const selected = chip.id === selectedFilter;
        return (
          <TouchableOpacity
            key={chip.id}
            onPress={() => onChange(chip.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${chip.label}${selected ? ", selected" : ""}`}
            accessibilityHint={
              selected ? "Currently active filter." : "Double tap to filter by this type."
            }
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant,
                borderColor: selected ? theme.colors.primary : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selected
                    ? theme.colors.onPrimary
                    : theme.colors.onSurfaceVariant,
                },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  chip: {
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
