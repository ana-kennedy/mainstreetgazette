import React, { useCallback, useRef, useState } from "react";
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

import { Screen } from "../components/Screen";
import { WeatherContent } from "../components/WeatherModal";
import { useSounds } from "../context/SoundContext";
import { DISNEY_PARKS, type WeatherData, fetchWeatherForPark } from "../services/weatherService";
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
      { key: "mk",  shortName: "Magic Kingdom",     fullName: "Magic Kingdom",                Logo: MagicKingdomSvg,         nameKeywords: ["magic kingdom"] },
      { key: "ep",  shortName: "EPCOT",             fullName: "EPCOT",                        Logo: EpcotSvg,                nameKeywords: ["epcot"] },
      { key: "hs",  shortName: "Hollywood Studios", fullName: "Hollywood Studios",            Logo: HollywoodStudiosSvg,     nameKeywords: ["hollywood studios"] },
      { key: "ak",  shortName: "Animal Kingdom",    fullName: "Animal Kingdom",               Logo: AnimalKingdomSvg,        nameKeywords: ["animal kingdom"] },
    ],
  },
  {
    resortId: "dla",
    resortLabel: "Disneyland Resort",
    parks: [
      { key: "dl",  shortName: "Disneyland",        fullName: "Disneyland Park",              Logo: DisneylandAnaheimSvg,    nameKeywords: ["disneyland"] },
      { key: "ca",  shortName: "Calif. Adventure",  fullName: "Disney California Adventure",  Logo: CaliforniaAdventureSvg,  nameKeywords: ["california adventure"] },
    ],
  },
  {
    resortId: "dlp",
    resortLabel: "Disneyland Paris",
    parks: [
      { key: "dlp", shortName: "Disneyland Paris",  fullName: "Disneyland Park Paris",        Logo: DisneylandParisSvg,      nameKeywords: ["disneyland"] },
      { key: "wds", shortName: "Walt Disney Studios", fullName: "Walt Disney Studios Park",   Logo: WaltDisneyStudiosParisSvg, nameKeywords: ["walt disney studios", "studios park", "adventure world"] },
    ],
  },
  {
    resortId: "tdr",
    resortLabel: "Tokyo Disney Resort",
    parks: [
      { key: "tdl", shortName: "Tokyo Disneyland",  fullName: "Tokyo Disneyland",             Logo: TokyoDisneylandSvg,      nameKeywords: ["tokyo disneyland"] },
      { key: "tds", shortName: "Tokyo DisneySea",   fullName: "Tokyo DisneySea",              Logo: TokyoDisneySea,          nameKeywords: ["disneysea", "disney sea"] },
    ],
  },
  {
    resortId: "shdl",
    resortLabel: "Shanghai Disney Resort",
    parks: [
      { key: "sdl", shortName: "Shanghai Disneyland", fullName: "Shanghai Disneyland",        Logo: ShanghaiDisneylandSvg,   nameKeywords: ["shanghai"] },
    ],
  },
  {
    resortId: "hkdl",
    resortLabel: "Hong Kong Disneyland",
    parks: [
      { key: "hkdl", shortName: "Hong Kong Disneyland", fullName: "Hong Kong Disneyland",    Logo: HongKongDisneylandSvg,   nameKeywords: ["hong kong"] },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type CollapsibleSection = "weather" | "hours" | "waittimes";

interface ParkData {
  isLoading: boolean;
  isLoaded: boolean;
  weather: WeatherData | null;
  weatherError: string | null;
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

          {/* Weather */}
          {(data?.weather || data?.weatherError) ? (
            <>
              <Pressable
                onPress={() => toggleSection("weather")}
                onLongPress={() => toggleSection("weather")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Weather, ${expanded.has("weather") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
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
                  <WeatherContent data={data.weather} currentRef={weatherRef} />
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
                accessibilityRole="button"
                accessibilityLabel={`Today's Hours, ${expanded.has("hours") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
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

          {/* Wait Times */}
          {data?.isLoaded ? (
            <>
              <Pressable
                onPress={() => toggleSection("waittimes")}
                onLongPress={() => toggleSection("waittimes")}
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.65 }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Wait Times, ${expanded.has("waittimes") ? "expanded" : "collapsed"}`}
                accessibilityHint="Double tap or long press to expand or collapse."
              >
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
                    return (
                      <View
                        key={a.id}
                        accessible
                        style={[styles.waitRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
                        accessibilityLabel={`${a.name}. ${waitAccessLabel(a)}`}
                      >
                        <Text
                          style={[styles.waitName, { color: theme.colors.onSurface }]}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          numberOfLines={2}
                        >
                          {a.name}
                        </Text>
                        <Text
                          style={[
                            styles.waitTime,
                            {
                              color: isWaiting ? theme.colors.primary : theme.colors.onSurfaceVariant,
                              fontWeight: isWaiting ? "700" : "400",
                            },
                          ]}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          {waitLabel(a)}
                        </Text>
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
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out. Check your connection.`)), LOAD_TIMEOUT_MS)
    ),
  ]);
}

export function ParksScreen() {
  const theme = useTheme();
  const { playBack } = useSounds();
  const [selectedPark, setSelectedPark] = useState<{ park: ParkDefinition; resort: ResortGroup } | null>(null);
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
        weather: null, weatherError: null,
        hours: null, hoursError: null,
        waitTimes: [], waitError: null,
      },
    }));

    let weather: WeatherData | null = null;
    let weatherError: string | null = null;
    let hours: ParkHours | null = null;
    let hoursError: string | null = null;
    let waitTimes: WaitTimeEntry[] = [];
    let waitError: string | null = null;

    try {
      const resortPark = DISNEY_PARKS.find((p) => p.id === resort.resortId) ?? DISNEY_PARKS[0];

      const [weatherResult, destResult] = await Promise.allSettled([
        raceTimeout(fetchWeatherForPark(resortPark), "Weather"),
        raceTimeout(fetchDisneyDestinations(), "Park destinations"),
      ]);

      weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
      weatherError = weatherResult.status === "rejected"
        ? (weatherResult.reason instanceof Error ? weatherResult.reason.message : "Unable to load weather.")
        : null;

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
      [key]: { isLoading: false, isLoaded: true, weather, weatherError, hours, hoursError, waitTimes, waitError },
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.screenTitle} accessibilityRole="header">
          Parks
        </Text>

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
  waitName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  waitTime: {
    fontSize: 14,
    minWidth: 76,
    textAlign: "right",
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
