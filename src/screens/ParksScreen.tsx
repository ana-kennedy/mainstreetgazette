import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { DestinationDataSection } from "../components/DestinationDataSection";
import { EmptyState } from "../components/EmptyState";
import { FeedItemCard } from "../components/FeedItemCard";
import { GazetteCard } from "../components/GazetteCard";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import type { FeedItem } from "../domain/models";
import type { DiscoverStackParamList } from "../navigation/types";
import {
  exploreDestinations,
  filterAggregateItemsForDestination,
  filterItemsForDestination,
  filterResortWideItems,
  getChildDestinations,
  getDestination,
  type DestinationMediaType,
} from "../services/destinationContentService";
import type { DestinationSectionState, ExploreDestination } from "../types/exploreTypes";

type ExploreHomeProps = NativeStackScreenProps<DiscoverStackParamList, "ParksHome">;
type ResortProps = NativeStackScreenProps<DiscoverStackParamList, "ResortDashboard">;
type ParkProps = NativeStackScreenProps<DiscoverStackParamList, "ParkDashboard">;
type CruiseProps = NativeStackScreenProps<DiscoverStackParamList, "CruiseDashboard">;
type ShipProps = NativeStackScreenProps<DiscoverStackParamList, "ShipDashboard">;
type ResultsProps = NativeStackScreenProps<DiscoverStackParamList, "DestinationContentResults">;

const mediaSections: { type: Exclude<DestinationMediaType, "all">; title: string }[] = [
  { type: "stories", title: "Stories" },
  { type: "podcasts", title: "Podcasts" },
  { type: "videos", title: "Videos" },
  { type: "community", title: "Community" },
];

const destinationGroups = [
  { title: "Walt Disney World", ids: ["wdw"] },
  { title: "Disneyland Resort", ids: ["dla"] },
  { title: "Disney Cruise Line", ids: ["dcl"] },
  { title: "International Resorts", ids: ["dlp", "tdr", "hkdl", "shdr"] },
  { title: "Disney Entertainment", ids: ["entertainment"] },
];

function sourceNameFor(app: ReturnType<typeof useAppContext>, item: FeedItem): string {
  return app.sources.find((source) => source.id === item.sourceID)?.name ?? item.authorOrChannel ?? "Main Street Gazette";
}

function openItem(navigation: any, item: FeedItem) {
  navigation.navigate("FeedDetail", { item });
}

function useDestinationData(destinationId: string | undefined) {
  return useMemo(() => (destinationId ? getDestination(destinationId) : undefined), [destinationId]);
}

function OrientationText({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} accessible accessibilityRole="text">
      {children}
    </Text>
  );
}

function DestinationButton({
  destination,
  onPress,
  originRef,
}: {
  destination: ExploreDestination;
  onPress: () => void;
  originRef?: React.Ref<View>;
}) {
  const theme = useTheme();
  return (
    <GazetteCard
      onPress={onPress}
      accessibilityLabel={destination.name}
      accessibilityHint="Double tap to open this destination."
      style={styles.destinationCard}
    >
      <View ref={originRef} style={styles.destinationRow}>
        <View style={[styles.destinationIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name={destination.type === "cruise_line" ? "ferry" : destination.type === "entertainment" ? "movie-open" : "castle"}
            size={22}
            color={theme.colors.onPrimaryContainer}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
        <View style={styles.destinationText}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {destination.name}
          </Text>
          {destination.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {destination.description}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.onSurfaceVariant}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </GazetteCard>
  );
}

function StaticGuidance({ title, rows }: { title: string; rows: string[] }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="titleMedium" accessibilityRole="header" style={{ color: theme.colors.onSurface }}>
        {title}
      </Text>
      {rows.map((row) => (
        <Text key={row} variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
          {row}
        </Text>
      ))}
    </View>
  );
}

function DestinationShelves({
  destination,
  items,
  aggregate,
  navigation,
}: {
  destination: ExploreDestination;
  items: FeedItem[];
  aggregate?: boolean;
  navigation: any;
}) {
  const app = useAppContext();
  const playback = usePlayback();
  const filteredByType = useMemo(
    () =>
      mediaSections.map((section) => ({
        ...section,
        items: aggregate
          ? filterAggregateItemsForDestination(items, destination, section.type)
          : filterItemsForDestination(items, destination, section.type),
      })),
    [aggregate, destination, items]
  );

  return (
    <View style={styles.shelves}>
      {filteredByType.map((section) => {
        const preview = section.items.slice(0, 3);
        return (
          <View key={section.type} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" accessibilityRole="header">
                {section.title}
              </Text>
              {section.items.length > preview.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`See all ${section.title.toLowerCase()} for ${destination.name}`}
                  onPress={() =>
                    navigation.navigate("DestinationContentResults", {
                      destinationId: destination.id,
                      mediaType: section.type,
                      title: `${destination.name} ${section.title}`,
                    })
                  }
                  style={styles.seeAll}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </Pressable>
              ) : null}
            </View>
            {preview.length > 0 ? (
              preview.map((item) => (
                <FeedItemCard
                  key={item.id}
                  item={item}
                  settings={app.settings}
                  sourceName={sourceNameFor(app, item)}
                  onOpen={(opened) => openItem(navigation, opened)}
                  onPlay={(played) => playback.playItem(played)}
                  onQueue={(queued) => playback.addToQueue(queued)}
                  onToggleSaved={app.toggleSaved}
                  displayMode="minimal"
                />
              ))
            ) : (
              <Text variant="bodySmall">No {section.title.toLowerCase()} are currently available for this destination.</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function DynamicDestinationSections({ destination }: { destination: ExploreDestination }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const emptyWeather: DestinationSectionState<string> = {
    status: "empty",
    message: `${destination.name} weather is not currently available in this view. Check the official destination app or posted notices for same-day conditions.`,
  };
  const emptyWaits: DestinationSectionState<string> = {
    status: "empty",
    message: `${destination.name} does not have verified current wait-time data available here right now.`,
  };
  const setSection = (key: string) => (next: boolean) => setExpanded((prev) => ({ ...prev, [key]: next }));
  const retry = (label: string) => AccessibilityInfo.announceForAccessibility(`${label} retry requested.`);

  return (
    <View style={styles.section}>
      <DestinationDataSection<string>
        title="Current Conditions"
        state={emptyWeather}
        expanded={Boolean(expanded.weather)}
        onExpandedChange={setSection("weather")}
        onRetry={() => retry("Weather")}
        renderData={(data) => <Text>{data}</Text>}
        contentAnnouncement="Current conditions follow."
      />
      <DestinationDataSection<string>
        title="Current Wait Times"
        state={emptyWaits}
        expanded={Boolean(expanded.waits)}
        onExpandedChange={setSection("waits")}
        onRetry={() => retry("Wait times")}
        renderData={(data) => <Text>{data}</Text>}
        contentAnnouncement="Wait-time availability follows."
      />
    </View>
  );
}

export function ParksScreen({ navigation }: ExploreHomeProps) {
  const originRefs = useRef<Record<string, View | null>>({});

  const openDestination = useCallback(
    (destination: ExploreDestination) => {
      const params = { destinationId: destination.id, originCardId: destination.id };
      if (destination.type === "cruise_line") navigation.navigate("CruiseDashboard", params as any);
      else if (destination.type === "cruise_ship") navigation.navigate("ShipDashboard", params as any);
      else if (destination.type === "theme_park" || destination.type === "district" || destination.type === "water_park") {
        navigation.navigate("ParkDashboard", params as any);
      } else {
        navigation.navigate("ResortDashboard", params as any);
      }
    },
    [navigation]
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          Explore
        </Text>
        <Text variant="titleMedium">Choose Your Destination</Text>
        {destinationGroups.map((group) => (
          <View key={group.title} style={styles.section}>
            <Text variant="titleMedium" accessibilityRole="header">
              {group.title}
            </Text>
            {group.ids
              .map((id) => getDestination(id))
              .filter((destination): destination is ExploreDestination => Boolean(destination))
              .map((destination) => (
                <DestinationButton
                  key={destination.id}
                  destination={destination}
                  originRef={(node) => {
                    originRefs.current[destination.id] = node;
                  }}
                  onPress={() => openDestination(destination)}
                />
              ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

export function ResortDashboardScreen({ navigation, route }: ResortProps) {
  const app = useAppContext();
  const destination = useDestinationData(route.params.destinationId);
  const children = useMemo(() => (destination ? getChildDestinations(destination.id) : []), [destination]);
  if (!destination) return <EmptyState title="Destination unavailable" body="This destination could not be found." />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          {destination.name}
        </Text>
        <OrientationText>Explore, {destination.name}.</OrientationText>
        {destination.description ? <Text>{destination.description}</Text> : null}
        <StaticGuidance
          title={`Around ${destination.name}`}
          rows={[
            "Getting Around uses static planning guidance and should be checked against official same-day transportation notices.",
            "Entertainment Guide coverage is editorial and planning-focused, not a live showtime feed.",
          ]}
        />
        <View style={styles.section}>
          <Text variant="titleMedium" accessibilityRole="header">
            Choose a destination
          </Text>
          {children.map((child) => (
            <DestinationButton
              key={child.id}
              destination={child}
              onPress={() => navigation.navigate(child.type === "cruise_ship" ? "ShipDashboard" : "ParkDashboard", { destinationId: child.id })}
            />
          ))}
        </View>
        <DestinationShelves destination={destination} items={app.items} aggregate navigation={navigation} />
      </ScrollView>
    </Screen>
  );
}

export function ParkDashboardScreen({ navigation, route }: ParkProps) {
  const app = useAppContext();
  const destination = useDestinationData(route.params.destinationId);
  const parent = useDestinationData(destination?.parentId);
  const resortWideItems = useMemo(
    () => (parent ? filterResortWideItems(app.items, parent, "all").slice(0, 3) : []),
    [app.items, parent]
  );
  const playback = usePlayback();

  if (!destination) return <EmptyState title="Destination unavailable" body="This destination could not be found." />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          {destination.name}
        </Text>
        <OrientationText>
          Explore{parent ? `, ${parent.name}` : ""}, {destination.name}.
        </OrientationText>
        <DynamicDestinationSections destination={destination} />
        <StaticGuidance
          title="Getting Around"
          rows={[
            "This is static transportation guidance. Use official signs and apps for current route changes, closures, or weather interruptions.",
          ]}
        />
        <StaticGuidance
          title="Entertainment Guide"
          rows={[
            "This is static planning guidance for shows, fireworks, and entertainment. It is not a live showtime feed.",
          ]}
        />
        <DestinationShelves destination={destination} items={app.items} navigation={navigation} />
        {parent && resortWideItems.length > 0 ? (
          <View style={styles.section}>
            <Text variant="titleMedium" accessibilityRole="header">
              Around {parent.name}
            </Text>
            {resortWideItems.map((item) => (
              <FeedItemCard
                key={item.id}
                item={item}
                settings={app.settings}
                sourceName={sourceNameFor(app, item)}
                onOpen={(opened) => openItem(navigation, opened)}
                onPlay={(played) => playback.playItem(played)}
                onQueue={(queued) => playback.addToQueue(queued)}
                onToggleSaved={app.toggleSaved}
                displayMode="minimal"
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

export function CruiseDashboardScreen({ navigation, route }: CruiseProps) {
  const app = useAppContext();
  const destination = useDestinationData(route.params.destinationId);
  const ships = useMemo(() => getChildDestinations("dcl").filter((item) => item.type === "cruise_ship"), []);
  const ports = useMemo(() => getChildDestinations("dcl").filter((item) => item.type === "private_destination"), []);

  if (!destination) return <EmptyState title="Destination unavailable" body="This destination could not be found." />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          Disney Cruise Line
        </Text>
        <OrientationText>Explore, Disney Cruise Line.</OrientationText>
        <StaticGuidance
          title="Planning and Accessibility"
          rows={[
            "Cruise guidance here is editorial and sourced from Gazette coverage. Live ship location, itinerary status, and port status are omitted unless a verified source is connected.",
            "Dining and entertainment coverage is shown as planning guidance, not live operational data.",
          ]}
        />
        <View style={styles.section}>
          <Text variant="titleMedium" accessibilityRole="header">
            Ships
          </Text>
          {ships.map((ship) => (
            <DestinationButton
              key={ship.id}
              destination={ship}
              onPress={() => navigation.navigate("ShipDashboard", { destinationId: ship.id })}
            />
          ))}
        </View>
        <View style={styles.section}>
          <Text variant="titleMedium" accessibilityRole="header">
            Destinations and ports
          </Text>
          {ports.map((port) => (
            <DestinationButton
              key={port.id}
              destination={port}
              onPress={() => navigation.navigate("ParkDashboard", { destinationId: port.id })}
            />
          ))}
        </View>
        <DestinationShelves destination={destination} items={app.items} aggregate navigation={navigation} />
      </ScrollView>
    </Screen>
  );
}

export function ShipDashboardScreen({ navigation, route }: ShipProps) {
  const app = useAppContext();
  const destination = useDestinationData(route.params.destinationId);
  if (!destination) return <EmptyState title="Ship unavailable" body="This ship dashboard could not be found." />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          {destination.name}
        </Text>
        <OrientationText>Explore, Disney Cruise Line, {destination.name}.</OrientationText>
        <StaticGuidance
          title="Ship Overview"
          rows={[
            "Ship pages collect sourced coverage, planning, dining, entertainment, stateroom, and accessibility information.",
            "Live ship position, current itinerary, sailing delays, weather at sea, and operational status are not shown without a verified live source.",
          ]}
        />
        <DestinationShelves destination={destination} items={app.items} navigation={navigation} />
      </ScrollView>
    </Screen>
  );
}

export function DestinationContentResultsScreen({ navigation, route }: ResultsProps) {
  const app = useAppContext();
  const playback = usePlayback();
  const destination = useDestinationData(route.params.destinationId);
  const items = useMemo(() => {
    if (!destination) return [];
    const aggregate = destination.type === "resort" || destination.type === "cruise_line";
    return aggregate
      ? filterAggregateItemsForDestination(app.items, destination, route.params.mediaType)
      : filterItemsForDestination(app.items, destination, route.params.mediaType);
  }, [app.items, destination, route.params.mediaType]);

  if (!destination) return <EmptyState title="Coverage unavailable" body="This destination could not be found." />;

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.resultsHeader}>
            <Text variant="headlineSmall" accessibilityRole="header">
              {route.params.title}
            </Text>
            <OrientationText>Explore, {destination.name}, filtered coverage.</OrientationText>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No coverage yet"
            body={`No ${route.params.mediaType} are currently available for ${destination.name}.`}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.resultItem}>
            <FeedItemCard
              item={item}
              settings={app.settings}
              sourceName={sourceNameFor(app, item)}
              onOpen={(opened) => openItem(navigation, opened)}
              onPlay={(played) => playback.playItem(played)}
              onQueue={(queued) => playback.addToQueue(queued)}
              onToggleSaved={app.toggleSaved}
            />
          </View>
        )}
        contentContainerStyle={items.length === 0 ? styles.emptyResults : styles.resultsList}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
  },
  title: {
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  shelves: {
    gap: 14,
  },
  destinationCard: {
    gap: 0,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  destinationIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationText: {
    flex: 1,
    gap: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  seeAll: {
    minHeight: 36,
    justifyContent: "center",
  },
  seeAllText: {
    fontWeight: "700",
  },
  resultsHeader: {
    padding: 16,
    gap: 6,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  resultsList: {
    paddingBottom: 20,
  },
  emptyResults: {
    flexGrow: 1,
  },
});
