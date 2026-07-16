import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { CalendarEvent, EventStatus } from "../intelligence/phase13/types";

const TYPE_LABELS: Record<string, string> = {
  festival: "Festival",
  ticketed_party: "Party",
  refurbishment: "Refurb",
  cruise_sailing: "Cruise",
  movie_release: "In Theaters",
  disney_plus_release: "Disney+",
  rundisney: "runDisney",
};

function formatDateBadge(event: CalendarEvent): { top: string; bottom: string } {
  const date = new Date(event.startDate + "T00:00:00");
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate().toString();
  return { top: month, bottom: day };
}

function useStatusColor(status: EventStatus): string {
  const theme = useTheme();
  switch (status) {
    case "active":
      return theme.colors.primary;
    case "ending_soon":
      return theme.colors.error;
    case "upcoming":
      return (theme.colors as unknown as Record<string, string>)["secondary"] ?? theme.colors.primary;
    default:
      return theme.colors.onSurfaceVariant;
  }
}

function statusLabel(event: CalendarEvent): string {
  switch (event.status) {
    case "active":
      return event.daysUntilEnd != null ? `${event.daysUntilEnd}d left` : "Now";
    case "ending_soon":
      return `${event.daysUntilEnd}d left`;
    case "upcoming":
      return event.daysUntilStart === 0 ? "Today" : `in ${event.daysUntilStart}d`;
    default:
      return "Ended";
  }
}

function EventRow({
  event,
  onPress,
}: {
  event: CalendarEvent;
  onPress: () => void;
}) {
  const theme = useTheme();
  const badge = formatDateBadge(event);
  const typeLabel = TYPE_LABELS[event.type] ?? event.type;
  const color = useStatusColor(event.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent" },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={event.accessibilityLabel}
      accessibilityHint={event.accessibilityHint}
    >
      {/* Date badge */}
      <View
        style={[styles.dateBadge, { backgroundColor: theme.colors.surfaceVariant }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[styles.dateBadgeMonth, { color }]}>{badge.top}</Text>
        <Text style={[styles.dateBadgeDay, { color: theme.colors.onSurface }]}>{badge.bottom}</Text>
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: theme.colors.tertiaryContainer ?? theme.colors.surfaceVariant }]}>
            <Text
              style={[styles.typeBadgeText, { color: theme.colors.onTertiaryContainer ?? theme.colors.onSurfaceVariant }]}
              accessible={false}
            >
              {typeLabel}
            </Text>
          </View>
          <Text style={[styles.statusLabel, { color }]} accessible={false}>
            {statusLabel(event)}
          </Text>
        </View>

        <Text
          variant="bodyMedium"
          numberOfLines={2}
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          {event.title}
        </Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={16}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

interface EventCalendarSectionProps {
  calendar: { active: CalendarEvent[]; endingSoon: CalendarEvent[]; upcoming: CalendarEvent[] };
  onPressEvent: (event: CalendarEvent) => void;
}

export function EventCalendarSection({ calendar, onPressEvent }: EventCalendarSectionProps) {
  const theme = useTheme();

  // Combine: ending-soon first (most urgent), then active, then upcoming
  const rows: CalendarEvent[] = [
    ...calendar.endingSoon,
    ...calendar.active.filter((e) => !calendar.endingSoon.some((s) => s.id === e.id)),
    ...calendar.upcoming,
  ].slice(0, 6);

  if (rows.length === 0) return null;

  return (
    <View style={styles.container} accessibilityRole="list" accessibilityLabel="Disney events calendar">
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={"calendar-month" as any}
          size={18}
          color={theme.colors.primary}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text
          variant="titleMedium"
          style={[styles.headerText, { color: theme.colors.onSurface }]}
          accessibilityRole="header"
        >
          Upcoming Events
        </Text>
      </View>

      {rows.map((event) => (
        <EventRow key={event.id} event={event} onPress={() => onPressEvent(event)} />
      ))}

      <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerText: {
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  dateBadge: {
    width: 36,
    height: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dateBadgeMonth: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  title: {
    fontWeight: "500",
    lineHeight: 19,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
});
