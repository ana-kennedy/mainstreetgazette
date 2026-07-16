import React, { useCallback, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SvgProps } from "react-native-svg";

import { DestinationProfileCard } from "../components/DestinationProfileCard";
import { ExploreIntelligenceBar } from "../components/ExploreIntelligenceBar";
import { FeedItemCard } from "../components/FeedItemCard";
import { Screen } from "../components/Screen";
import { WeatherContent } from "../components/WeatherModal";
import { FreshnessLabel } from "../components/FreshnessLabel";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import { buildExploreHub } from "../intelligence/phase17";
import { getDestinationProfile } from "../intelligence/phase18";
import { buildAttractionIntelligence } from "../intelligence/phase19";
import { buildParkDiningIntelligence } from "../intelligence/phase20";
import { buildParkEntertainmentHub } from "../intelligence/phase21";
import { buildTripPlanningIntelligence } from "../intelligence/phase22";
import { buildParkAccessibilityIntelligence } from "../intelligence/phase23";
import type { ParksStackParamList } from "../navigation/types";
import type { ParkTagKey } from "../utils/parkTagger";
import {
  DISNEY_PARKS,
  describeWeatherCode,
  tempDisplay,
  resolveWeatherUnit,
  type WeatherData,
  type WeatherAlert,
  type WeatherDisplayUnit,
  fetchWeatherForPark,
  fetchActiveWeatherAlerts,
} from "../services/weatherService";
import {
  ParkHours,
  WaitTimeEntry,
  fetchDisneyDestinations,
  fetchParkHours,
  fetchParkLiveData,
  getDestinationForWeatherPark,
} from "../services/parksService";

import MagicKingdomSvg from "../../art/park_logos/magic_kingdom.svg";
import EpcotSvg from "../../art/park_logos/epcot.svg";
import HollywoodStudiosSvg from "../../art/park_logos/hollywood_studios.svg";
import AnimalKingdomSvg from "../../art/park_logos/animal_kingdom.svg";
import DisneylandAnaheimSvg from "../../art/park_logos/disneyland_anaheim.svg";
import CaliforniaAdventureSvg from "../../art/park_logos/california_adventure.svg";
import DisneylandParisSvg from "../../art/park_logos/disneyland_paris.svg";
import WaltDisneyStudiosParisSvg from "../../art/park_logos/walt_disney_studios_paris.svg";
import TokyoDisneylandSvg from "../../art/park_logos/tokyo_disneyland.svg";
import TokyoDisneySea from "../../art/park_logos/tokyo_disneysea.svg";
import ShanghaiDisneylandSvg from "../../art/park_logos/shanghai_disneyland.svg";
import HongKongDisneylandSvg from "../../art/park_logos/hong_kong_disneyland.svg";

// ─── Static park/resort data ──────────────────────────────────────────────────

type SvgComponent = React.FC<SvgProps>;

interface ParkDefinition {
  key: string;
  shortName: string;
  fullName: string;
  Logo: SvgComponent;
  nameKeywords: string[];
  parkTagKey: ParkTagKey;
}

interface ResortGroup {
  resortId: string;
  resortLabel: string;
  parks: ParkDefinition[];
}

const RESORT_GROUPS: ResortGroup[] = [
  {
    resortId: "wdw",
    resortLabel: "Walt Disney World",
    parks: [
      { key: "mk",  shortName: "Magic Kingdom",     fullName: "Magic Kingdom",                Logo: MagicKingdomSvg,         nameKeywords: ["magic kingdom"],    parkTagKey: "magic_kingdom" },
      { key: "ep",  shortName: "EPCOT",             fullName: "EPCOT",                        Logo: EpcotSvg,                nameKeywords: ["epcot"],            parkTagKey: "epcot" },
      { key: "hs",  shortName: "Hollywood Studios", fullName: "Hollywood Studios",            Logo: HollywoodStudiosSvg,     nameKeywords: ["hollywood studios"], parkTagKey: "hollywood_studios" },
      { key: "ak",  shortName: "Animal Kingdom",    fullName: "Animal Kingdom",               Logo: AnimalKingdomSvg,        nameKeywords: ["animal kingdom"],   parkTagKey: "animal_kingdom" },
    ],
  },
  {
    resortId: "dla",
    resortLabel: "Disneyland Resort",
    parks: [
      { key: "dl",  shortName: "Disneyland",        fullName: "Disneyland Park",              Logo: DisneylandAnaheimSvg,    nameKeywords: ["disneyland"],             parkTagKey: "disneyland" },
      { key: "ca",  shortName: "Calif. Adventure",  fullName: "Disney California Adventure",  Logo: CaliforniaAdventureSvg,  nameKeywords: ["california adventure"],   parkTagKey: "california_adventure" },
    ],
  },
  {
    resortId: "dlp",
    resortLabel: "Disneyland Paris",
    parks: [
      { key: "dlp", shortName: "Disneyland Paris",  fullName: "Disneyland Park Paris",        Logo: DisneylandParisSvg,      nameKeywords: ["disneyland"],                                             parkTagKey: "disneyland_paris" },
      { key: "wds", shortName: "Walt Disney Studios", fullName: "Walt Disney Studios Park",   Logo: WaltDisneyStudiosParisSvg, nameKeywords: ["walt disney studios", "studios park", "adventure world"],  parkTagKey: "walt_disney_studios_paris" },
    ],
  },
  {
    resortId: "tdr",
    resortLabel: "Tokyo Disney Resort",
    parks: [
      { key: "tdl", shortName: "Tokyo Disneyland",  fullName: "Tokyo Disneyland",             Logo: TokyoDisneylandSvg,      nameKeywords: ["tokyo disneyland"],    parkTagKey: "tokyo_disneyland" },
      { key: "tds", shortName: "Tokyo DisneySea",   fullName: "Tokyo DisneySea",              Logo: TokyoDisneySea,          nameKeywords: ["disneysea", "disney sea"], parkTagKey: "tokyo_disneysea" },
    ],
  },
  {
    resortId: "shdl",
    resortLabel: "Shanghai Disney Resort",
    parks: [
      { key: "sdl", shortName: "Shanghai Disneyland", fullName: "Shanghai Disneyland",        Logo: ShanghaiDisneylandSvg,   nameKeywords: ["shanghai"],   parkTagKey: "shanghai_disneyland" },
    ],
  },
  {
    resortId: "hkdl",
    resortLabel: "Hong Kong Disneyland",
    parks: [
      { key: "hkdl", shortName: "Hong Kong Disneyland", fullName: "Hong Kong Disneyland",    Logo: HongKongDisneylandSvg,   nameKeywords: ["hong kong"],  parkTagKey: "hong_kong_disneyland" },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type CollapsibleSection =
  | "weather"
  | "hours"
  | "refurbishments"
  | "relatednews"
  | "waittimes"
  | "diningnews"
  | "entertainment"
  | "tripplanning"
  | "accessnews"
  | "transportation"
  | "showsfireworks";

interface ParkData {
  isLoading: boolean;
  isLoaded: boolean;
  weather: WeatherData | null;
  weatherError: string | null;
  weatherAlerts: WeatherAlert[];
  hours: ParkHours | null;
  hoursError: string | null;
  waitTimes: WaitTimeEntry[];
  waitError: string | null;
}

// ─── Wait time helpers ────────────────────────────────────────────────────────

function waitLabel(entry: { status: string; waitMinutes: number | null }): string {
  if (entry.status === "CLOSED") return "Closed";
  if (entry.status === "DOWN") return "Temporarily down";
  if (entry.status === "REFURBISHMENT") return "Refurbishment";
  if (entry.waitMinutes !== null) return `${entry.waitMinutes} min`;
  return entry.status.charAt(0) + entry.status.slice(1).toLowerCase();
}

function waitAccessLabel(entry: { status: string; waitMinutes: number | null }): string {
  if (entry.status === "CLOSED") return "Closed.";
  if (entry.status === "DOWN") return "Temporarily down.";
  if (entry.status === "REFURBISHMENT") return "Under refurbishment.";
  if (entry.waitMinutes !== null) return `${entry.waitMinutes} minute wait.`;
  return `${entry.status.charAt(0)}${entry.status.slice(1).toLowerCase()}.`;
}

const ACCESS_TOPIC_ICONS: Record<string, string> = {
  das: "card-account-details-outline",
  mobility: "wheelchair-accessibility",
  visual: "eye-outline",
  hearing: "ear-hearing",
  service_animals: "paw",
  sensory: "meditation",
  general: "information-outline",
};

type WaitBand = "short" | "medium" | "long" | "neutral";

function waitBand(entry: { status: string; waitMinutes: number | null }): WaitBand {
  if (entry.status !== "OPERATING" || entry.waitMinutes === null) return "neutral";
  if (entry.waitMinutes < 20) return "short";
  if (entry.waitMinutes < 45) return "medium";
  return "long";
}

function formatLastUpdated(isoString?: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getOperatingAttractions(waitTimes: WaitTimeEntry[]): WaitTimeEntry[] {
  return waitTimes.filter((entry) => entry.status === "OPERATING" && entry.waitMinutes !== null);
}

function getBusiestAttractions(waitTimes: WaitTimeEntry[], limit = 3): WaitTimeEntry[] {
  return [...getOperatingAttractions(waitTimes)]
    .sort((a, b) => (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0))
    .slice(0, limit);
}

function buildTodayGlanceItems(
  park: ParkDefinition,
  data: ParkData | undefined,
  entertainmentCount: number,
  accessibilityCount: number,
  weatherUnit: WeatherDisplayUnit,
): string[] {
  const items: string[] = [];

  if (data?.hours) {
    items.push(
      data.hours.isOperating
        ? `Open ${data.hours.openingTimeLabel} to ${data.hours.closingTimeLabel}`
        : "Closed today",
    );
  } else if (data?.hoursError) {
    items.push("Hours unavailable");
  }

  if (data?.weather) {
    const weather = describeWeatherCode(data.weather.current.weatherCode).label;
    items.push(`${weather}, ${tempDisplay(data.weather.current.temperatureF, weatherUnit)}`);
    if (data.weather.today.precipitationChance >= 40) {
      items.push(`${data.weather.today.precipitationChance}% chance of rain today`);
    }
  } else if (data?.weatherError) {
    items.push("Weather unavailable");
  }

  const busiest = getBusiestAttractions(data?.waitTimes ?? [], 2);
  if (busiest.length > 0) {
    items.push(
      `Longest waits: ${busiest
        .map((entry) => `${entry.name} ${entry.waitMinutes} minutes`)
        .join(", ")}`,
    );
  } else if (data?.isLoaded && !data.waitError) {
    items.push("Live waits not currently available");
  }

  const refurbCount = (data?.waitTimes ?? []).filter((entry) => entry.status === "REFURBISHMENT").length;
  if (refurbCount > 0) {
    items.push(`${refurbCount} ${refurbCount === 1 ? "refurbishment" : "refurbishments"} today`);
  }

  if (entertainmentCount > 0) {
    items.push(`${entertainmentCount} entertainment ${entertainmentCount === 1 ? "update" : "updates"}`);
  }

  if (accessibilityCount > 0) {
    items.push(`${accessibilityCount} accessibility ${accessibilityCount === 1 ? "update" : "updates"}`);
  }

  return items.length > 0 ? items : [`${park.fullName} information is loading.`];
}

type GuidanceItem = {
  id: string;
  title: string;
  detail: string;
  icon: string;
};

function transportationGuidance(park: ParkDefinition, resort: ResortGroup): GuidanceItem[] {
  if (resort.resortId === "wdw" && park.key === "mk") {
    return [
      {
        id: "mk-monorail",
        title: "Monorail and ferry",
        detail: "Most guests from the Transportation and Ticket Center use the monorail or ferryboat to reach the park entrance.",
        icon: "train",
      },
      {
        id: "mk-bus",
        title: "Resort buses",
        detail: "Disney resort buses usually drop off near the front entrance, avoiding the Transportation and Ticket Center transfer.",
        icon: "bus",
      },
      {
        id: "mk-access",
        title: "Accessibility note",
        detail: "Allow extra time for ramps, elevator waits, stroller parking, and mobility-device boarding.",
        icon: "wheelchair-accessibility",
      },
    ];
  }

  if (resort.resortId === "wdw" && park.key === "ep") {
    return [
      {
        id: "ep-monorail",
        title: "Monorail connection",
        detail: "EPCOT connects to the Transportation and Ticket Center by monorail; International Gateway is useful for nearby resorts.",
        icon: "train",
      },
      {
        id: "ep-skyliner",
        title: "Skyliner access",
        detail: "The Disney Skyliner serves the International Gateway area when weather and operations allow.",
        icon: "gondola",
      },
    ];
  }

  if (resort.resortId === "wdw" && park.key === "hs") {
    return [
      {
        id: "hs-skyliner",
        title: "Skyliner and walking paths",
        detail: "Skyliner, resort boats, buses, and walking paths may serve this park depending on where you start.",
        icon: "gondola",
      },
      {
        id: "hs-close",
        title: "Arrival timing",
        detail: "Build in time for security, show crowds, and evening transportation after nighttime entertainment.",
        icon: "clock-outline",
      },
    ];
  }

  if (resort.resortId === "wdw" && park.key === "ak") {
    return [
      {
        id: "ak-bus",
        title: "Bus-focused park",
        detail: "Animal Kingdom is primarily served by buses and parking trams; there is no monorail or Skyliner stop.",
        icon: "bus",
      },
      {
        id: "ak-distance",
        title: "Walking distances",
        detail: "Plan extra time for longer paths between lands, especially with mobility devices or midday heat.",
        icon: "walk",
      },
    ];
  }

  return [
    {
      id: "transport-main",
      title: "Getting there",
      detail: "Check the resort's official app or signs for current transportation status, drop-off points, and accessibility boarding.",
      icon: "map-marker-path",
    },
    {
      id: "transport-time",
      title: "Timing",
      detail: "Allow extra time around opening, parade exits, fireworks exits, and weather-related service changes.",
      icon: "clock-outline",
    },
  ];
}

function showGuidance(park: ParkDefinition): GuidanceItem[] {
  if (park.key === "mk") {
    return [
      {
        id: "mk-fireworks",
        title: "Nighttime fireworks",
        detail: "Check the official app for today's exact showtime and consider audio description or viewing needs before choosing a spot.",
        icon: "firework",
      },
      {
        id: "mk-parade",
        title: "Parades and cavalcades",
        detail: "Main Street and hub areas can become crowded before parade times; plan crossings and restroom breaks early.",
        icon: "flag-variant",
      },
      {
        id: "mk-stage",
        title: "Castle-stage shows",
        detail: "Outdoor stage shows can change for weather, heat, or special events, so treat times as flexible.",
        icon: "drama-masks",
      },
    ];
  }

  if (park.key === "ep") {
    return [
      {
        id: "ep-night",
        title: "Nighttime spectacular",
        detail: "Lagoon viewing can be crowded and loud; choose a viewing area with an easy exit route if that matters to you.",
        icon: "firework",
      },
      {
        id: "ep-live",
        title: "Live entertainment",
        detail: "World Showcase performances are often short and outdoor; check same-day times before walking across the park.",
        icon: "music",
      },
    ];
  }

  if (park.key === "hs") {
    return [
      {
        id: "hs-night",
        title: "Nighttime shows",
        detail: "Evening shows can require early arrival and may include loud effects, water, projections, or pyrotechnics.",
        icon: "spotlight-beam",
      },
      {
        id: "hs-stage",
        title: "Stage shows",
        detail: "Indoor and outdoor show schedules vary; checking show duration can help plan breaks between rides.",
        icon: "drama-masks",
      },
    ];
  }

  return [
    {
      id: "showtimes",
      title: "Shows and character times",
      detail: "Use the official app for exact same-day showtimes, character locations, and weather-related changes.",
      icon: "calendar-clock",
    },
    {
      id: "sensory",
      title: "Sensory planning",
      detail: "Entertainment may include loud music, lights, crowds, and sudden effects; plan a quieter exit route if needed.",
      icon: "ear-hearing",
    },
  ];
}

// ─── ParkLogoButton ───────────────────────────────────────────────────────────

const LOGO_SIZE = 64;

function ParkLogoButton({
  park,
  onPress,
  onAccessibilityAction,
}: {
  park: ParkDefinition;
  onPress: () => void;
  onAccessibilityAction: (action: string) => void;
}) {
  const theme = useTheme();
  const { Logo } = park;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.parkItem, pressed && { opacity: 0.65 }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={park.fullName}
      accessibilityHint="Double tap to view park details."
      accessibilityActions={[
        { name: "weather",   label: "Weather" },
        { name: "hours",     label: "Park Hours" },
        { name: "waittimes", label: "Wait Times" },
      ]}
      onAccessibilityAction={(e) => onAccessibilityAction(e.nativeEvent.actionName)}
    >
      <View
        style={styles.logoCircle}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Logo width={LOGO_SIZE} height={LOGO_SIZE} />
      </View>
      <Text
        style={[styles.parkLabel, { color: theme.colors.onSurface }]}
        numberOfLines={2}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {park.shortName}
      </Text>
    </Pressable>
  );
}

// ─── ParkDetailSheet ──────────────────────────────────────────────────────────

function ParkDetailSheet({
  park,
  resort,
  data,
  onClose,
}: {
  park: ParkDefinition;
  resort: ResortGroup;
  data: ParkData | undefined;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const weatherRef = useRef<View>(null);
  const { Logo } = park;
  const app = useAppContext();

  const [expanded, setExpanded] = useState<Set<CollapsibleSection>>(new Set());
  const toggleSection = (section: CollapsibleSection) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const noWaitData = !data?.isLoading && data?.isLoaded && data.waitTimes.length === 0;

  const RELATED_NEWS_LIMIT = 5;
  const relatedNews = useMemo(() => {
    const tag = `park:${park.parkTagKey}`;
    return app.items
      .filter((item) => item.tags.includes(tag))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, RELATED_NEWS_LIMIT);
  }, [app.items, park.parkTagKey]);

  const sourceByID = useMemo(
    () => new Map(app.sources.map((s) => [s.id, s.name])),
    [app.sources]
  );

  const destinationProfileResult = useMemo(
    () => getDestinationProfile(park.parkTagKey, app.clusters),
    [park.parkTagKey, app.clusters],
  );

  const attractionIntel = useMemo(
    () =>
      buildAttractionIntelligence({
        attractions: (data?.waitTimes ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          status: a.status,
        })),
        clusters: app.clusters,
      }),
    [data?.waitTimes, app.clusters],
  );

  const diningIntel = useMemo(
    () => buildParkDiningIntelligence({ parkTagKey: park.parkTagKey, clusters: app.clusters }),
    [park.parkTagKey, app.clusters],
  );

  const entertainmentHub = useMemo(
    () => buildParkEntertainmentHub({ parkTagKey: park.parkTagKey, clusters: app.clusters }),
    [park.parkTagKey, app.clusters],
  );

  const tripPlanning = useMemo(
    () => buildTripPlanningIntelligence({ parkTagKey: park.parkTagKey, clusters: app.clusters }),
    [park.parkTagKey, app.clusters],
  );

  const accessibilityIntel = useMemo(
    () => buildParkAccessibilityIntelligence({ parkTagKey: park.parkTagKey, clusters: app.clusters }),
    [park.parkTagKey, app.clusters],
  );

  const weatherUnit = resolveWeatherUnit(app.settings?.weatherUnit ?? "auto");

  const todayGlanceItems = useMemo(
    () => buildTodayGlanceItems(park, data, entertainmentHub.clusters.length, accessibilityIntel.items.length, weatherUnit),
    [park, data, entertainmentHub.clusters.length, accessibilityIntel.items.length, weatherUnit],
  );

  const transportationItems = useMemo(
    () => transportationGuidance(park, resort),
    [park, resort],
  );

  const showGuideItems = useMemo(
    () => showGuidance(park),
    [park],
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Header */}
        <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.outline }]}>
          <View
            style={styles.headerLogoCircle}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Logo width={48} height={48} />
          </View>
          <View
            style={styles.sheetHeaderText}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${park.fullName}, ${resort.resortLabel}`}
          >
            <Text
              style={[styles.sheetTitle, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {park.fullName}
            </Text>
            <Text
              style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {resort.resortLabel}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.colors.surfaceVariant },
              pressed && { opacity: 0.6 },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={theme.colors.onSurfaceVariant}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>

          {/* Phase 18: Destination Profile */}
          {destinationProfileResult ? (
            <DestinationProfileCard result={destinationProfileResult} />
          ) : null}

          <View
            style={[styles.glanceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={`Today at a glance. ${todayGlanceItems.join(". ")}.`}
          >
            <Text
              style={[styles.glanceTitle, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              Today at a Glance
            </Text>
            {todayGlanceItems.map((item) => (
              <View
                key={item}
                style={styles.glanceRow}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={[styles.glanceDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.glanceText, { color: theme.colors.onSurfaceVariant }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          {/* Phase 22: Trip Planning Tips */}
          {tripPlanning.tips.length > 0 ? (
            <>
              <Pressable
                onPress={() => toggleSection("tripplanning")}
                onLongPress={() => toggleSection("tripplanning")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Plan Your Visit${tripPlanning.hasUrgentTip ? ", has alerts" : ""}, ${expanded.has("tripplanning") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={18}
                  color={tripPlanning.hasUrgentTip ? theme.colors.error : theme.colors.onSurfaceVariant}
                  style={styles.sectionHeaderIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.sectionHeader, { color: tripPlanning.hasUrgentTip ? theme.colors.error : theme.colors.onSurface }]}>
                  Plan Your Visit
                  {tripPlanning.hasUrgentTip ? " ⚠" : ""}
                </Text>
                <MaterialCommunityIcons
                  name={expanded.has("tripplanning") ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
              {expanded.has("tripplanning") ? (
                <View style={styles.diningNewsContainer}>
                  {tripPlanning.tips.map((tip) => (
                    <View
                      key={tip.id}
                      style={[
                        styles.tripTipRow,
                        {
                          backgroundColor:
                            tip.urgency === "highlight"
                              ? theme.colors.primaryContainer
                              : tip.urgency === "caution"
                              ? theme.colors.errorContainer
                              : theme.colors.surfaceVariant,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={tip.accessibilityLabel}
                    >
                      <Text
                        style={[
                          styles.tripTipHeadline,
                          {
                            color:
                              tip.urgency === "highlight"
                                ? theme.colors.onPrimaryContainer
                                : tip.urgency === "caution"
                                ? theme.colors.error
                                : theme.colors.onSurface,
                          },
                        ]}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {tip.headline}
                      </Text>
                      {tip.detail ? (
                        <Text
                          style={[styles.tripTipDetail, { color: theme.colors.onSurfaceVariant }]}
                          numberOfLines={2}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          {tip.detail}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* Loading */}
          {data?.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" accessibilityLabel={`Loading data for ${park.fullName}`} />
              <Text
                style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                Loading park data…
              </Text>
            </View>
          ) : null}

          {/* Transportation */}
          <Pressable
            onPress={() => toggleSection("transportation")}
            onLongPress={() => toggleSection("transportation")}
            style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`Transportation, ${expanded.has("transportation") ? "expanded" : "collapsed"}`}
            accessibilityHint="Double tap or long press to expand or collapse."
          >
            <MaterialCommunityIcons
              name="bus"
              size={18}
              color={theme.colors.onSurfaceVariant}
              style={styles.sectionHeaderIcon}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
              Transportation
            </Text>
            <MaterialCommunityIcons
              name={expanded.has("transportation") ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.onSurfaceVariant}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
          {expanded.has("transportation") ? (
            <View style={styles.guidanceList}>
              <View style={styles.guidanceFreshnessRow}>
                <FreshnessLabel kind="planningGuide" />
              </View>
              {transportationItems.map((item) => (
                <View
                  key={item.id}
                  style={[styles.guidanceRow, { borderColor: theme.colors.outlineVariant }]}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`${item.title}. ${item.detail}`}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={theme.colors.primary}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <View style={styles.guidanceTextBlock} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <Text style={[styles.guidanceTitle, { color: theme.colors.onSurface }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.guidanceDetail, { color: theme.colors.onSurfaceVariant }]}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Shows & Fireworks */}
          <Pressable
            onPress={() => toggleSection("showsfireworks")}
            onLongPress={() => toggleSection("showsfireworks")}
            style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`Shows and Fireworks, ${expanded.has("showsfireworks") ? "expanded" : "collapsed"}`}
            accessibilityHint="Double tap or long press to expand or collapse."
          >
            <MaterialCommunityIcons
              name="firework"
              size={18}
              color={theme.colors.onSurfaceVariant}
              style={styles.sectionHeaderIcon}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
              Shows & Fireworks
            </Text>
            <MaterialCommunityIcons
              name={expanded.has("showsfireworks") ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.onSurfaceVariant}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
          {expanded.has("showsfireworks") ? (
            <View style={styles.guidanceList}>
              <View style={styles.guidanceFreshnessRow}>
                <FreshnessLabel kind="planningGuide" />
              </View>
              {showGuideItems.map((item) => (
                <View
                  key={item.id}
                  style={[styles.guidanceRow, { borderColor: theme.colors.outlineVariant }]}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`${item.title}. ${item.detail}`}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={theme.colors.primary}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <View style={styles.guidanceTextBlock} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <Text style={[styles.guidanceTitle, { color: theme.colors.onSurface }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.guidanceDetail, { color: theme.colors.onSurfaceVariant }]}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
              ))}
              {entertainmentHub.clusters.length > 0 ? (
                <Text style={[styles.guidanceFootnote, { color: theme.colors.onSurfaceVariant }]}>
                  Related entertainment news appears in Entertainment below.
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Weather Alerts (NWS — Walt Disney World and Disneyland only) */}
          {data?.weatherAlerts && data.weatherAlerts.length > 0 ? (
            <View style={styles.alertBannerContainer}>
              {data.weatherAlerts.map((alert) => {
                const isSevere = alert.severity === "Extreme" || alert.severity === "Severe";
                return (
                  <View
                    key={alert.id}
                    accessible
                    accessibilityRole="alert"
                    style={[
                      styles.alertBanner,
                      {
                        backgroundColor: isSevere ? theme.colors.errorContainer : theme.colors.secondaryContainer,
                        borderColor:     isSevere ? theme.colors.error : theme.colors.outline,
                      },
                    ]}
                    accessibilityLabel={`Weather alert: ${alert.event}. ${alert.headline} Expires ${alert.expiresLabel}.`}
                  >
                    <View
                      style={styles.alertBannerHeader}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={18}
                        color={isSevere ? theme.colors.error : theme.colors.onSecondaryContainer}
                      />
                      <Text
                        style={[
                          styles.alertBannerEvent,
                          { color: isSevere ? theme.colors.error : theme.colors.onSecondaryContainer },
                        ]}
                      >
                        {alert.event}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.alertBannerHeadline,
                        { color: isSevere ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      numberOfLines={3}
                    >
                      {alert.headline}
                    </Text>
                    <Text
                      style={[
                        styles.alertBannerExpires,
                        { color: isSevere ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      Until {alert.expiresLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Weather */}
          {(data?.weather || data?.weatherError) ? (
            <>
              <Pressable
                onPress={() => toggleSection("weather")}
                onLongPress={() => toggleSection("weather")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Weather, ${expanded.has("weather") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
                <MaterialCommunityIcons
                  name="weather-partly-cloudy"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.sectionHeaderIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                  Weather
                </Text>
                <MaterialCommunityIcons
                  name={expanded.has("weather") ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
              {expanded.has("weather") ? (
                data.weatherError ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]} accessibilityRole="alert">
                    {data.weatherError}
                  </Text>
                ) : data.weather ? (
                  <WeatherContent data={data.weather} currentRef={weatherRef} parkHours={data.hours} />
                ) : null
              ) : null}
            </>
          ) : null}

          {/* Today's Hours */}
          {data?.isLoaded ? (
            <>
              <Pressable
                onPress={() => toggleSection("hours")}
                onLongPress={() => toggleSection("hours")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Today's Hours, ${expanded.has("hours") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.sectionHeaderIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                  Today's Hours
                </Text>
                <MaterialCommunityIcons
                  name={expanded.has("hours") ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
              {expanded.has("hours") ? (
                data.hoursError ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]} accessibilityRole="alert">
                    {data.hoursError}
                  </Text>
                ) : data.hours ? (
                  <View
                    accessible
                    style={[styles.hoursCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
                    accessibilityLabel={
                      data.hours.isOperating
                        ? `Open ${data.hours.openingTimeLabel} to ${data.hours.closingTimeLabel}.`
                        : "Closed today."
                    }
                  >
                    <Text
                      style={[
                        styles.hoursText,
                        { color: data.hours.isOperating ? theme.colors.onSurface : theme.colors.onSurfaceVariant },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      {data.hours.isOperating
                        ? `${data.hours.openingTimeLabel} – ${data.hours.closingTimeLabel}`
                        : "Closed today"}
                    </Text>
                  </View>
                ) : null
              ) : null}
            </>
          ) : null}

          {/* Refurbishments */}
          {data?.isLoaded ? (() => {
            const refurbs = data.waitTimes.filter((a) => a.status === "REFURBISHMENT");
            const countLabel = refurbs.length > 0 ? ` (${refurbs.length})` : "";
            return (
              <>
                <Pressable
                  onPress={() => toggleSection("refurbishments")}
                  onLongPress={() => toggleSection("refurbishments")}
                  style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`Refurbishments${countLabel}, ${expanded.has("refurbishments") ? "expanded" : "collapsed"}`}
                  accessibilityHint="Double tap or long press to expand or collapse."
                >
                  <MaterialCommunityIcons
                    name="hammer-wrench"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.sectionHeaderIcon}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                    Refurbishments{countLabel}
                  </Text>
                  <MaterialCommunityIcons
                    name={expanded.has("refurbishments") ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                </Pressable>
                {expanded.has("refurbishments") ? (
                  data.waitError ? (
                    <Text style={[styles.errorText, { color: theme.colors.error }]} accessibilityRole="alert">
                      {data.waitError}
                    </Text>
                  ) : refurbs.length === 0 ? (
                    <Text
                      style={[styles.emptyNote, { color: theme.colors.onSurfaceVariant }]}
                      accessible
                      accessibilityLabel={`No current refurbishments at ${park.fullName}.`}
                    >
                      No current refurbishments.
                    </Text>
                  ) : (
                    refurbs.map((a) => {
                      const updatedLabel = formatLastUpdated(a.lastUpdated);
                      return (
                        <View
                          key={a.id}
                          accessible
                          style={[styles.refurbRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
                          accessibilityLabel={`${a.name}. Under refurbishment.${updatedLabel ? ` As of ${updatedLabel}.` : ""}`}
                        >
                          <MaterialCommunityIcons
                            name="wrench-outline"
                            size={16}
                            color={theme.colors.onSurfaceVariant}
                            style={styles.refurbIcon}
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                          />
                          <View style={styles.refurbTextGroup} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                            <Text style={[styles.refurbName, { color: theme.colors.onSurface }]} numberOfLines={3}>
                              {a.name}
                            </Text>
                            {updatedLabel ? (
                              <Text style={[styles.refurbUpdated, { color: theme.colors.onSurfaceVariant }]}>
                                As of {updatedLabel}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )
                ) : null}
              </>
            );
          })() : null}

          {/* Phase 21: Entertainment Hub */}
          {data?.isLoaded && entertainmentHub.clusters.length > 0 ? (
            <>
              <Pressable
                onPress={() => toggleSection("entertainment")}
                onLongPress={() => toggleSection("entertainment")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Entertainment News (${entertainmentHub.clusters.length}), ${expanded.has("entertainment") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
                <MaterialCommunityIcons
                  name="movie-open-outline"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.sectionHeaderIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                  Entertainment ({entertainmentHub.clusters.length})
                  {entertainmentHub.hasSpectacular ? " ✨" : ""}
                </Text>
                <MaterialCommunityIcons
                  name={expanded.has("entertainment") ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
              {expanded.has("entertainment") ? (
                <View style={styles.diningNewsContainer}>
                  {entertainmentHub.clusters.map((ec) => (
                    <View
                      key={ec.clusterId}
                      style={[styles.diningRow, { borderColor: theme.colors.outlineVariant }]}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={ec.accessibilityLabel}
                    >
                      <MaterialCommunityIcons
                        name={ec.isBreaking ? "alert-decagram" : ec.isOfficial ? "check-decagram" : "movie-open-outline"}
                        size={16}
                        color={ec.isBreaking ? theme.colors.error : ec.isOfficial ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        style={styles.diningRowIcon}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      />
                      <Text
                        style={[styles.diningHeadline, { color: theme.colors.onSurface }]}
                        numberOfLines={3}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {ec.headline}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* Phase 23: Accessibility News */}
          {data?.isLoaded && accessibilityIntel.items.length > 0 ? (
            <>
              <Pressable
                onPress={() => toggleSection("accessnews")}
                onLongPress={() => toggleSection("accessnews")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Accessibility News${accessibilityIntel.hasDasUpdate ? ", DAS update" : ""} (${accessibilityIntel.items.length}), ${expanded.has("accessnews") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
                <MaterialCommunityIcons
                  name="wheelchair-accessibility"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.sectionHeaderIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                  Accessibility{accessibilityIntel.hasDasUpdate ? " · DAS" : ""} ({accessibilityIntel.items.length})
                </Text>
                <MaterialCommunityIcons
                  name={expanded.has("accessnews") ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
              {expanded.has("accessnews") ? (
                <View style={styles.diningNewsContainer}>
                  {accessibilityIntel.items.map((item) => (
                    <View
                      key={item.clusterId}
                      style={[
                        styles.diningRow,
                        { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant },
                      ]}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={item.accessibilityLabel}
                    >
                      <MaterialCommunityIcons
                        name={(ACCESS_TOPIC_ICONS[item.topic] ?? "information-outline") as any}
                        size={16}
                        color={theme.colors.primary}
                        style={styles.diningRowIcon}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      />
                      <View style={styles.refurbTextGroup} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <Text style={[styles.accessTopicBadge, { color: theme.colors.primary }]}>
                          {item.topic.replace(/_/g, " ").toUpperCase()}
                        </Text>
                        <Text
                          style={[styles.diningHeadline, { color: theme.colors.onSurface }]}
                          numberOfLines={3}
                        >
                          {item.headline}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* Phase 20: Dining News */}
          {data?.isLoaded && diningIntel.diningClusters.length > 0 ? (
            <>
              <Pressable
                onPress={() => toggleSection("diningnews")}
                onLongPress={() => toggleSection("diningnews")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Dining News (${diningIntel.diningClusters.length}), ${expanded.has("diningnews") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
                <MaterialCommunityIcons
                  name="silverware-fork-knife"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.sectionHeaderIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                  Dining News ({diningIntel.diningClusters.length})
                </Text>
                <MaterialCommunityIcons
                  name={expanded.has("diningnews") ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
              {expanded.has("diningnews") ? (
                <View style={styles.diningNewsContainer}>
                  {diningIntel.diningClusters.map((dc) => (
                    <View
                      key={dc.clusterId}
                      style={[styles.diningRow, { borderColor: theme.colors.outlineVariant }]}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={dc.accessibilityLabel}
                    >
                      <MaterialCommunityIcons
                        name={dc.isOfficial ? "check-decagram" : "silverware-fork-knife"}
                        size={16}
                        color={dc.isOfficial ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        style={styles.diningRowIcon}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      />
                      <Text
                        style={[styles.diningHeadline, { color: theme.colors.onSurface }]}
                        numberOfLines={3}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {dc.headline}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* Latest News */}
          {data?.isLoaded ? (() => {
            const countLabel = relatedNews.length > 0 ? ` (${relatedNews.length})` : "";
            return (
              <>
                <Pressable
                  onPress={() => toggleSection("relatednews")}
                  onLongPress={() => toggleSection("relatednews")}
                  style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`Latest News${countLabel}, ${expanded.has("relatednews") ? "expanded" : "collapsed"}`}
                  accessibilityHint="Double tap or long press to expand or collapse."
                >
                  <MaterialCommunityIcons
                    name="newspaper-variant-outline"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.sectionHeaderIcon}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                    Latest News{countLabel}
                  </Text>
                  <MaterialCommunityIcons
                    name={expanded.has("relatednews") ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                </Pressable>
                {expanded.has("relatednews") ? (
                  relatedNews.length === 0 ? (
                    <Text
                      style={[styles.emptyNote, { color: theme.colors.onSurfaceVariant }]}
                      accessible
                      accessibilityLabel={`No related news found for ${park.fullName} yet. Refresh feeds to load the latest stories.`}
                    >
                      No related stories yet. Pull to refresh on the News tab.
                    </Text>
                  ) : (
                    relatedNews.map((item) => (
                      <FeedItemCard
                        key={item.id}
                        item={item}
                        settings={app.settings}
                        displayMode="full"
                        sourceName={sourceByID.get(item.sourceID) ?? "Unknown"}
                        onOpen={() => {}}
                        onToggleSaved={app.toggleSaved}
                        onMarkRead={app.markAsRead}
                        onMarkUnread={app.markAsUnread}
                        onMuteSource={app.muteSource}
                      />
                    ))
                  )
                ) : null}
              </>
            );
          })() : null}

          {/* Wait Times */}
          {data?.isLoaded ? (
            <>
              <Pressable
                onPress={() => toggleSection("waittimes")}
                onLongPress={() => toggleSection("waittimes")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Wait Times, ${expanded.has("waittimes") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
                <MaterialCommunityIcons
                  name="timer-sand"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.sectionHeaderIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
                  Wait Times
                </Text>
                <MaterialCommunityIcons
                  name={expanded.has("waittimes") ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
              {expanded.has("waittimes") ? (
                data.waitError ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]} accessibilityRole="alert">
                    {data.waitError}
                  </Text>
                ) : noWaitData ? (
                  <Text
                    style={[styles.emptyNote, { color: theme.colors.onSurfaceVariant }]}
                    accessible
                    accessibilityLabel={`Live wait times not currently available for ${park.fullName}.`}
                  >
                    Live wait times not currently available.
                  </Text>
                ) : (
                  data.waitTimes.map((a) => {
                    const isWaiting = a.status === "OPERATING" && a.waitMinutes !== null;
                    const intel = attractionIntel.byAttractionName.get(a.name);
                    const hasNews = intel?.hasNewsAlert ?? false;
                    const band = waitBand(a);
                    const bandColor =
                      band === "short"  ? theme.colors.primary :
                      band === "medium" ? theme.colors.tertiary :
                      band === "long"   ? theme.colors.error :
                      theme.colors.onSurfaceVariant;
                    return (
                      <View
                        key={a.id}
                        accessible
                        style={[styles.waitRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
                        accessibilityLabel={`${a.name}. ${waitAccessLabel(a)}${hasNews ? " In the news." : ""}`}
                      >
                        <View style={styles.waitNameRow}>
                          <Text
                            style={[styles.waitName, { color: theme.colors.onSurface }]}
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                            numberOfLines={2}
                          >
                            {a.name}
                          </Text>
                          {hasNews ? (
                            <View
                              style={[styles.newsBadge, { backgroundColor: theme.colors.secondaryContainer }]}
                              accessibilityElementsHidden
                              importantForAccessibility="no-hide-descendants"
                            >
                              <Text style={[styles.newsBadgeText, { color: theme.colors.onSecondaryContainer }]}>
                                NEWS
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View
                          style={styles.waitTimeRow}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          {isWaiting ? <View style={[styles.waitDot, { backgroundColor: bandColor }]} /> : null}
                          <Text
                            style={[
                              styles.waitTime,
                              { color: bandColor, fontWeight: isWaiting ? "700" : "400" },
                            ]}
                          >
                            {waitLabel(a)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )
              ) : null}
            </>
          ) : null}

        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── ParksScreen ──────────────────────────────────────────────────────────────

const LOAD_TIMEOUT_MS = 20_000;

function raceTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out. Check your connection.`)), LOAD_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  }) as Promise<T>;
}

type Props = NativeStackScreenProps<ParksStackParamList, "ParksHome">;
type ExploreView = "hub" | "destinations";
type ExploreHubItem = {
  label: string;
  description: string;
  icon: string;
  onPress: () => void;
};

export function ParksScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { playBack } = useSounds();
  const app = useAppContext();
  const [selectedPark, setSelectedPark] = useState<{ park: ParkDefinition; resort: ResortGroup } | null>(null);
  const [view, setView] = useState<ExploreView>("hub");

  React.useEffect(() => {
    if (route.params?.initialView) {
      setView(route.params.initialView);
    }
  }, [route.params?.initialView]);

  const exploreHub = useMemo(
    () => buildExploreHub({ clusters: app.clusters }),
    [app.clusters],
  );
  const [parkDataMap, setParkDataMap] = useState<Record<string, ParkData>>({});
  const loadStateRef = useRef<Record<string, boolean>>({});

  const loadParkData = useCallback(async (park: ParkDefinition, resort: ResortGroup) => {
    const key = park.key;
    if (loadStateRef.current[key]) return;
    loadStateRef.current[key] = true;

    setParkDataMap((prev) => ({
      ...prev,
      [key]: {
        isLoading: true, isLoaded: false,
        weather: null, weatherError: null, weatherAlerts: [],
        hours: null, hoursError: null,
        waitTimes: [], waitError: null,
      },
    }));

    let weather: WeatherData | null = null;
    let weatherError: string | null = null;
    let weatherAlerts: WeatherAlert[] = [];
    let hours: ParkHours | null = null;
    let hoursError: string | null = null;
    let waitTimes: WaitTimeEntry[] = [];
    let waitError: string | null = null;

    try {
      const resortPark = DISNEY_PARKS.find((p) => p.id === resort.resortId) ?? DISNEY_PARKS[0];

      const [weatherResult, alertsResult, destResult] = await Promise.allSettled([
        raceTimeout(fetchWeatherForPark(resortPark), "Weather"),
        raceTimeout(fetchActiveWeatherAlerts(resortPark), "Weather alerts"),
        raceTimeout(fetchDisneyDestinations(), "Park destinations"),
      ]);

      weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
      weatherError = weatherResult.status === "rejected"
        ? (weatherResult.reason instanceof Error ? weatherResult.reason.message : "Unable to load weather.")
        : null;

      // Alert fetch failures are silent — they're a bonus banner, not core weather data,
      // and international parks legitimately return an empty list (no NWS coverage).
      weatherAlerts = alertsResult.status === "fulfilled" ? alertsResult.value : [];

      if (destResult.status === "fulfilled") {
        const destination = getDestinationForWeatherPark(destResult.value, resort.resortId);
        if (destination) {
          const apiPark = destination.parks.find((p) =>
            park.nameKeywords.some((kw) => p.name.toLowerCase().includes(kw))
          );
          if (apiPark) {
            const [hoursResult, waitResult] = await Promise.allSettled([
              raceTimeout(fetchParkHours(apiPark), "Park hours"),
              raceTimeout(fetchParkLiveData(apiPark), "Wait times"),
            ]);
            if (hoursResult.status === "fulfilled") hours = hoursResult.value;
            else hoursError = hoursResult.reason instanceof Error ? hoursResult.reason.message : "Unable to load hours.";
            if (waitResult.status === "fulfilled") waitTimes = waitResult.value.attractions;
            else waitError = waitResult.reason instanceof Error ? waitResult.reason.message : "Unable to load wait times.";
          } else {
            hoursError = "Park schedule not available.";
            waitError = "Park wait times not available.";
          }
        } else {
          hoursError = "Resort information not available.";
          waitError = "Resort information not available.";
        }
      } else {
        const msg = destResult.reason instanceof Error ? destResult.reason.message : "Unable to load park data.";
        hoursError = msg;
        waitError = msg;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load park data.";
      weatherError = weatherError ?? msg;
      hoursError = msg;
      waitError = msg;
    }

    setParkDataMap((prev) => ({
      ...prev,
      [key]: { isLoading: false, isLoaded: true, weather, weatherError, weatherAlerts, hours, hoursError, waitTimes, waitError },
    }));
  }, []);

  const handleParkPress = useCallback(
    (park: ParkDefinition, resort: ResortGroup) => {
      setSelectedPark({ park, resort });
      loadParkData(park, resort);
      AccessibilityInfo.announceForAccessibility(`${park.fullName} details opened.`);
    },
    [loadParkData]
  );

  // Lets the new Explore-root destination cards (Phase 04) deep-link straight into a
  // specific resort's dashboard instead of always landing on the full destinations grid.
  const hasAppliedInitialResortRef = useRef(false);
  React.useEffect(() => {
    if (hasAppliedInitialResortRef.current) return;
    const resortId = route.params?.initialResortId;
    if (!resortId) return;
    const resort = RESORT_GROUPS.find((r) => r.resortId === resortId);
    const park = resort?.parks[0];
    if (resort && park) {
      hasAppliedInitialResortRef.current = true;
      handleParkPress(park, resort);
    }
  }, [route.params?.initialResortId, handleParkPress]);

  const openParentTab = useCallback(
    (tabName: "Discover" | "ForYou" | "News") => {
      navigation.getParent()?.navigate(tabName);
    },
    [navigation]
  );

  const hubItems: ExploreHubItem[] = useMemo(
    () => [
      {
        label: "Disney Destinations",
        description: "Browse resorts and parks, then open hours, weather, wait times, dining, transportation, accessibility, and news.",
        icon: "castle",
        onPress: () => {
          setView("destinations");
          AccessibilityInfo.announceForAccessibility("Disney Destinations opened.");
        },
      },
      {
        label: "Browse by Interest",
        description: "Explore attractions, dining, resorts, events, and topic relationships.",
        icon: "shape-outline",
        onPress: () => navigation.navigate("EntityGraph"),
      },
      {
        label: "Media",
        description: "Find Disney videos and podcast episodes.",
        icon: "play-circle-outline",
        onPress: () => openParentTab("Discover"),
      },
      {
        label: "Events",
        description: "Find current and upcoming Disney events in News.",
        icon: "calendar-month-outline",
        onPress: () => openParentTab("News"),
      },
      {
        label: "Trip Planning",
        description: "Open destination dashboards for planning tips, hours, weather, dining, entertainment, and transportation.",
        icon: "map-check-outline",
        onPress: () => {
          setView("destinations");
          AccessibilityInfo.announceForAccessibility("Choose a destination for trip planning.");
        },
      },
      {
        label: "Library",
        description: "Open saved stories and followed collections.",
        icon: "folder-outline",
        onPress: () => openParentTab("ForYou"),
      },
    ],
    [navigation, openParentTab]
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {view === "hub" ? (
          <>
            <Text variant="headlineMedium" style={styles.screenTitle} accessibilityRole="header">
              Explore
            </Text>

            <Pressable
              onPress={() => openParentTab("Discover")}
              accessibilityRole="search"
              accessibilityLabel="Search Disney"
              accessibilityHint="Double tap to search destinations, articles, events, podcasts, and videos."
              style={({ pressed }) => [
                styles.hubSearch,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={22}
                color={theme.colors.onSurfaceVariant}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text style={[styles.hubSearchText, { color: theme.colors.onSurfaceVariant }]}>
                Search Disney
              </Text>
            </Pressable>

            <View style={styles.hubList}>
              {hubItems.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  accessibilityRole="header"
                  accessibilityLabel={item.label}
                  accessibilityHint={item.description}
                  style={({ pressed }) => [
                    styles.hubRow,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={24}
                    color={theme.colors.primary}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <View style={styles.hubRowText}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                      {item.label}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.description}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={theme.colors.onSurfaceVariant}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setView("hub")}
              accessibilityRole="button"
              accessibilityLabel="Back to Explore"
              style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.65 }]}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={theme.colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text style={[styles.backText, { color: theme.colors.primary }]}>Explore</Text>
            </Pressable>

            <Text variant="headlineMedium" style={styles.screenTitle} accessibilityRole="header">
              Disney Destinations
            </Text>

            <ExploreIntelligenceBar hub={exploreHub} />

            {RESORT_GROUPS.map((resort) => (
              <View
                key={resort.resortId}
                style={[styles.resortSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
              >
                <Text
                  style={[styles.resortLabel, { color: theme.colors.onSurfaceVariant }]}
                  accessibilityRole="header"
                >
                  {resort.resortLabel}
                </Text>
                <View style={styles.parksRow}>
                  {resort.parks.map((park) => (
                    <ParkLogoButton
                      key={park.key}
                      park={park}
                      onPress={() => handleParkPress(park, resort)}
                      onAccessibilityAction={() => handleParkPress(park, resort)}
                    />
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.attribution}>
              <Text style={[styles.attributionText, { color: theme.colors.onSurfaceVariant }]}>
                Park hours and wait times via themeparks.wiki (community data). Weather via Open-Meteo. Not affiliated with or endorsed by Disney.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {selectedPark ? (
        <ParkDetailSheet
          park={selectedPark.park}
          resort={selectedPark.resort}
          data={parkDataMap[selectedPark.park.key]}
          onClose={() => {
            playBack();
            setSelectedPark(null);
            AccessibilityInfo.announceForAccessibility("Park details closed.");
          }}
        />
      ) : null}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  screenTitle: {
    textAlign: "left",
    fontWeight: "700",
    marginBottom: 4,
  },
  hubSearch: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  hubSearchText: {
    fontSize: 16,
    fontWeight: "500",
  },
  hubList: {
    gap: 10,
  },
  hubRow: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hubRowText: {
    flex: 1,
    gap: 2,
  },
  backRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Phase 24: Entity Graph button
  graphButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  graphButtonLabel: {
    flex: 1,
    fontWeight: "500",
  },

  // Resort sections
  resortSection: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  resortLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  parksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  // Park logo items
  parkItem: {
    alignItems: "center",
    width: 70,
    gap: 6,
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: "hidden",
  },
  parkLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 14,
  },

  // Modal sheet
  sheet: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  sheetHeaderText: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sheetSubtitle: {
    fontSize: 13,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: {
    padding: 16,
    gap: 8,
  },
  glanceCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  glanceTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  glanceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  glanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  glanceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 2,
    paddingVertical: 4,
  },
  sectionHeaderIcon: {
    marginRight: 8,
  },

  // Loading
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 15,
  },

  // Hours
  hoursCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hoursText: {
    fontSize: 16,
    fontWeight: "500",
  },

  // Wait times
  waitRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  waitNameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  waitName: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  newsBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  newsBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  waitTimeRow: {
    flexDirection: "row",
    alignItems:    "center",
    justifyContent: "flex-end",
    gap:           6,
    minWidth:      76,
  },
  waitDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  waitTime: {
    fontSize: 14,
  },

  // Refurbishments
  refurbRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  refurbIcon: {
    marginTop: 2,
  },
  refurbTextGroup: {
    flex: 1,
    gap: 3,
  },
  refurbName: {
    fontSize: 14,
    lineHeight: 20,
  },
  refurbUpdated: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Notes
  emptyNote: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Weather alerts (NWS)
  alertBannerContainer: {
    gap:        8,
    marginTop:  12,
  },
  alertBanner: {
    borderRadius: 10,
    borderWidth:  1.5,
    padding:      12,
    gap:          4,
  },
  alertBannerHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  alertBannerEvent: {
    fontSize:   14,
    fontWeight: "700",
  },
  alertBannerHeadline: {
    fontSize:   13,
    lineHeight: 18,
  },
  alertBannerExpires: {
    fontSize:   12,
    fontWeight: "600",
  },

  // Trip Planning (Phase 22)
  tripTipRow: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  tripTipHeadline: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  tripTipDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  guidanceList: {
    gap: 6,
    marginBottom: 4,
  },
  guidanceFreshnessRow: {
    marginBottom: 2,
  },
  guidanceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  guidanceTextBlock: {
    flex: 1,
    gap: 3,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  guidanceDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  guidanceFootnote: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
    paddingHorizontal: 2,
  },

  // Dining News (Phase 20)
  diningNewsContainer: {
    gap: 6,
    marginBottom: 4,
  },
  diningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  diningRowIcon: {
    marginTop: 2,
  },
  diningHeadline: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  accessTopicBadge: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    flexShrink: 0,
    marginTop: 2,
  },

  // Attribution
  attribution: {
    paddingVertical: 12,
  },
  attributionText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
