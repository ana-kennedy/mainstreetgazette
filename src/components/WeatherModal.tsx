import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  findNodeHandle
} from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FreshnessLabel } from "./FreshnessLabel";
import {
  DISNEY_PARKS,
  ParkInfo,
  WeatherData,
  describeWeatherCode,
  fetchWeatherForPark,
  humidityAccessText,
  resolveWeatherUnit,
  selectDisplayHours,
  summarizeHourly,
  tempAccessText,
  tempDisplay,
  uvIndexLabel,
  windAccessText,
  windDisplay,
} from "../services/weatherService";
import type { ParkHours } from "../services/parksService";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";

interface WeatherModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Weather content sections ────────────────────────────────────────────────

export interface WeatherContentProps {
  data: WeatherData;
  currentRef: React.RefObject<View | null>;
  /** When set, the hourly list trims to this park's operating window ± 1 hour. */
  parkHours?: ParkHours | null;
}

// Keep internal alias for the component's own usage
type SectionProps = WeatherContentProps;

export function WeatherContent({ data, currentRef, parkHours }: SectionProps) {
  const theme = useTheme();
  const app = useAppContext();
  const weatherUnit = resolveWeatherUnit(app.settings?.weatherUnit ?? "auto");
  const { current, tonight, today, nextThreeDays, hourlyToday } = data;
  const currentDesc = describeWeatherCode(current.weatherCode);
  const tonightDesc  = describeWeatherCode(tonight.weatherCode, true);
  const displayHours = selectDisplayHours(hourlyToday, parkHours);
  const hourlySummary = summarizeHourly(displayHours);

  const updatedLabel = data.fetchedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const handleAboutWeather = () => {
    Alert.alert(
      "About This Information",
      `Weather is provided by Open-Meteo, an independent weather data service, and is not an official Disney source. Last updated ${updatedLabel}.`
    );
  };

  return (
    <>
      {/* ── Updated timestamp + trust label — Constitution rule 11: every dynamic card
          shows last update time and offers About This Information (Phase 04). ── */}
      <View style={styles.updatedRow}>
        <FreshnessLabel kind="live" />
        <Text
          style={[styles.updatedAt, { color: theme.colors.onSurfaceVariant }]}
          accessibilityLabel={`Last updated: ${updatedLabel}`}
        >
          Updated {updatedLabel}
        </Text>
        <Pressable
          onPress={handleAboutWeather}
          accessibilityRole="button"
          accessibilityLabel="About This Information"
          accessibilityHint="Double tap to learn where this weather data comes from."
          hitSlop={8}
        >
          <Text style={[styles.aboutLink, { color: theme.colors.primary }]}>About This Information</Text>
        </Pressable>
      </View>

      {/* ── Current conditions ── */}
      <Text
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        Current Conditions
      </Text>
      <View
        ref={currentRef}
        accessible
        style={[styles.currentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        accessibilityLabel={
          `Current conditions at ${data.park.name}. ` +
          `Temperature: ${tempAccessText(current.temperatureF, weatherUnit)}. ` +
          `Feels like ${tempAccessText(current.feelsLikeF, weatherUnit)}. ` +
          `${currentDesc.label}.`
        }
      >
        <Text
          style={[styles.bigTemp, { color: theme.colors.onSurface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {tempDisplay(current.temperatureF, weatherUnit)}
        </Text>
        <Text
          style={[styles.feelsLike, { color: theme.colors.onSurfaceVariant }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          Feels like {tempDisplay(current.feelsLikeF, weatherUnit)}
        </Text>
        <View
          style={styles.conditionRow}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <MaterialCommunityIcons name={currentDesc.icon as any} size={24} color={theme.colors.onSurface} />
          <Text style={[styles.conditionText, { color: theme.colors.onSurface }]}>
            {currentDesc.label}
          </Text>
        </View>
      </View>

      {/* ── Details grid ── */}
      <View style={styles.detailsGrid}>
        <View
          accessible
          style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          accessibilityLabel={`UV index ${Math.round(current.uvIndex)}, ${uvIndexLabel(current.uvIndex)}.`}
        >
          <MaterialCommunityIcons name="weather-sunny-alert" size={20} color={theme.colors.primary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">UV Index</Text>
          <Text style={[styles.detailValue, { color: theme.colors.onSurface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Math.round(current.uvIndex)} · {uvIndexLabel(current.uvIndex)}
          </Text>
        </View>
        <View
          accessible
          style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          accessibilityLabel={humidityAccessText(current.humidityPercent)}
        >
          <MaterialCommunityIcons name="water-percent" size={20} color={theme.colors.primary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">Humidity</Text>
          <Text style={[styles.detailValue, { color: theme.colors.onSurface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Math.round(current.humidityPercent)}%
          </Text>
        </View>
        <View
          accessible
          style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          accessibilityLabel={`Wind ${windAccessText(current.windSpeedMph, current.windDirectionDeg)}.`}
        >
          <MaterialCommunityIcons name="weather-windy" size={20} color={theme.colors.primary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">Wind</Text>
          <Text style={[styles.detailValue, { color: theme.colors.onSurface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {windDisplay(current.windSpeedMph, current.windDirectionDeg)}
          </Text>
        </View>
        <View
          accessible
          style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          accessibilityLabel={`Sunset at ${data.sunsetLabel}. Sunrise was at ${data.sunriseLabel}.`}
        >
          <MaterialCommunityIcons name="weather-sunset-down" size={20} color={theme.colors.primary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">Sunset</Text>
          <Text style={[styles.detailValue, { color: theme.colors.onSurface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {data.sunsetLabel}
          </Text>
        </View>
      </View>

      {/* ── Today & Tonight ── */}
      <Text
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        Today &amp; Tonight
      </Text>

      {/* Today row */}
      {(() => {
        const d = describeWeatherCode(today.weatherCode);
        return (
          <View
            accessible
            style={[styles.forecastRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessibilityLabel={
              `Today. ${d.label}. ` +
              `High ${tempAccessText(today.highF, weatherUnit)}, low ${tempAccessText(today.lowF, weatherUnit)}. ` +
              `${today.precipitationChance}% chance of rain.`
            }
          >
            <Text
              style={[styles.dayLabel, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              Today
            </Text>
            <View
              style={styles.forecastConditionRow}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <MaterialCommunityIcons name={d.icon as any} size={18} color={theme.colors.onSurface} />
              <Text style={[styles.forecastCondition, { color: theme.colors.onSurface }]}>{d.label}</Text>
            </View>
            <View
              style={styles.forecastRight}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>H: {tempDisplay(today.highF, weatherUnit)}</Text>
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>L: {tempDisplay(today.lowF, weatherUnit)}</Text>
              <View style={styles.rainChanceRow}>
                <MaterialCommunityIcons name="water" size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.rainChance, { color: theme.colors.onSurfaceVariant }]}>{today.precipitationChance}%</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Tonight row */}
      <View
        accessible
        style={[styles.forecastRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        accessibilityLabel={
          `Tonight. ${tonightDesc.label}. ` +
          `Low ${tempAccessText(tonight.lowF, weatherUnit)}. ` +
          `${tonight.precipitationChance}% chance of rain.`
        }
      >
        <Text
          style={[styles.dayLabel, { color: theme.colors.onSurface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          Tonight
        </Text>
        <View
          style={styles.forecastConditionRow}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <MaterialCommunityIcons name={tonightDesc.icon as any} size={18} color={theme.colors.onSurface} />
          <Text style={[styles.forecastCondition, { color: theme.colors.onSurface }]}>{tonightDesc.label}</Text>
        </View>
        <View
          style={styles.forecastRight}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>L: {tempDisplay(tonight.lowF, weatherUnit)}</Text>
          <View style={styles.rainChanceRow}>
            <MaterialCommunityIcons name="water" size={12} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.rainChance, { color: theme.colors.onSurfaceVariant }]}>{tonight.precipitationChance}%</Text>
          </View>
        </View>
      </View>

      {/* ── 3-Day Forecast ── */}
      <Text
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        3-Day Forecast
      </Text>
      {nextThreeDays.map(day => {
        const d = describeWeatherCode(day.weatherCode);
        return (
          <View
            key={day.dateLabel}
            accessible
            style={[styles.forecastRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessibilityLabel={
              `${day.dateLabel}. ${d.label}. ` +
              `High ${tempAccessText(day.highF, weatherUnit)}, low ${tempAccessText(day.lowF, weatherUnit)}. ` +
              `${day.precipitationChance}% chance of rain.`
            }
          >
            <Text
              style={[styles.dayLabel, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {day.dateLabel}
            </Text>
            <View
              style={styles.forecastConditionRow}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <MaterialCommunityIcons name={d.icon as any} size={18} color={theme.colors.onSurface} />
              <Text style={[styles.forecastCondition, { color: theme.colors.onSurface }]}>{d.label}</Text>
            </View>
            <View
              style={styles.forecastRight}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>H: {tempDisplay(day.highF, weatherUnit)}</Text>
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>L: {tempDisplay(day.lowF, weatherUnit)}</Text>
              <View style={styles.rainChanceRow}>
                <MaterialCommunityIcons name="water" size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.rainChance, { color: theme.colors.onSurfaceVariant }]}>{day.precipitationChance}%</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* ── Today Hourly ── */}
      <Text
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        Today Hourly
      </Text>
      {hourlySummary ? (
        <Text style={[styles.hourlySummary, { color: theme.colors.onSurfaceVariant }]}>
          {hourlySummary}
        </Text>
      ) : null}
      {displayHours.map(slot => {
        const d = describeWeatherCode(slot.weatherCode);
        return (
          <View
            key={slot.hour}
            accessible
            style={[styles.hourlyRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessibilityLabel={
              `${slot.timeLabel}. ${tempAccessText(slot.temperatureF, weatherUnit)}. ` +
              `${d.label}. ${slot.precipitationChance}% chance of rain.`
            }
          >
            <Text
              style={[styles.hourLabel, { color: theme.colors.onSurfaceVariant }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {slot.timeLabel}
            </Text>
            <Text
              style={[styles.hourTemp, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {tempDisplay(slot.temperatureF, weatherUnit)}
            </Text>
            <View
              style={styles.hourConditionRow}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <MaterialCommunityIcons name={d.icon as any} size={16} color={theme.colors.onSurface} />
              <Text style={[styles.hourCondition, { color: theme.colors.onSurface }]}>{d.label}</Text>
            </View>
            <View
              style={styles.hourRainRow}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <MaterialCommunityIcons name="water" size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.hourRain, { color: theme.colors.onSurfaceVariant }]}>{slot.precipitationChance}%</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.bottomPad} />
    </>
  );
}

// ─── Main modal component ─────────────────────────────────────────────────────

export function WeatherModal({ visible, onClose }: WeatherModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { playBack, playScreenClose } = useSounds();
  const [selectedPark, setSelectedPark] = useState<ParkInfo | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const springAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        springAnim.setValue(1);
      } else {
        springAnim.setValue(0.88);
        Animated.spring(springAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 280,
          useNativeDriver: true,
        }).start();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const firstParkRef      = useRef<View>(null);
  const currentRef        = useRef<View>(null);
  const backButtonRef     = useRef<View>(null);

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedPark(null);
      setWeatherData(null);
      setError(null);
    }
  }, [visible]);

  // Focus first park item when park list becomes visible
  useEffect(() => {
    if (!visible || selectedPark !== null) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(firstParkRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 350);
    return () => clearTimeout(timer);
  }, [visible, selectedPark]);

  // Fetch weather when a park is selected
  useEffect(() => {
    if (!selectedPark) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setWeatherData(null);
    AccessibilityInfo.announceForAccessibility(`Loading weather for ${selectedPark.name}.`);

    fetchWeatherForPark(selectedPark)
      .then(data => {
        if (cancelled) return;
        setWeatherData(data);
        setIsLoading(false);
        AccessibilityInfo.announceForAccessibility(`Weather loaded for ${selectedPark.name}.`);
        setTimeout(() => {
          if (cancelled) return;
          const node = findNodeHandle(currentRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }, 500);
      })
      .catch(err => {
        if (cancelled) return;
        setIsLoading(false);
        const message = err instanceof Error ? err.message : "Unable to load weather.";
        setError(message);
        AccessibilityInfo.announceForAccessibility(`Error loading weather. ${message}`);
      });

    return () => { cancelled = true; };
  }, [selectedPark]);

  const handleBack = () => {
    if (selectedPark !== null) {
      playBack();
      setSelectedPark(null);
      setWeatherData(null);
      setError(null);
    } else {
      playScreenClose();
      onClose();
    }
  };

  const handleRetry = () => {
    const park = selectedPark;
    setSelectedPark(null);
    setTimeout(() => setSelectedPark(park), 50);
  };

  const navTitle  = selectedPark ? selectedPark.name : "Disney Parks Weather";
  const backLabel = selectedPark ? "Back to park list" : "Close weather";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleBack}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.screen,
          {
            backgroundColor: theme.colors.background,
            paddingTop:    insets.top,
            paddingBottom: insets.bottom,
            transform: [{ scale: springAnim }],
          }
        ]}
        accessibilityViewIsModal
      >
        {/* ── Navigation bar ── */}
        <View style={[styles.navBar, { borderBottomColor: theme.colors.outline }]}>
          <Pressable
            ref={backButtonRef}
            onPress={handleBack}
            style={({ pressed }) => [styles.navSideSlot, { opacity: pressed ? 0.55 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            accessibilityHint="Double tap to go back."
          >
            <Text style={[styles.navBackText, { color: theme.colors.primary }]}>
              {selectedPark ? "← Parks" : "Close"}
            </Text>
          </Pressable>

          <Text
            style={[styles.navTitle, { color: theme.colors.onBackground }]}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {navTitle}
          </Text>

          {/* Right spacer keeps title centred; hidden from screen readers */}
          <View
            style={styles.navSideSlot}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>

        {/* ── Content ── */}
        {selectedPark === null ? (
          /* Park picker */
          <ScrollView contentContainerStyle={styles.parkList} keyboardShouldPersistTaps="handled">
            <Text style={[styles.parkListSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Select a Disney park to view current weather and forecast.
            </Text>
            {DISNEY_PARKS.map((park, idx) => (
              <Pressable
                key={park.id}
                ref={idx === 0 ? firstParkRef : undefined}
                onPress={() => setSelectedPark(park)}
                style={({ pressed }) => [
                  styles.parkRow,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                    borderColor:     theme.colors.outline,
                  }
                ]}
                accessibilityRole="button"
                accessibilityLabel={park.name}
                accessibilityHint={`Double tap to load weather for ${park.name}.`}
              >
                <Text style={[styles.parkRowText, { color: theme.colors.onSurface }]}>
                  {park.name}
                </Text>
                <Text
                  style={[styles.parkRowChevron, { color: theme.colors.onSurfaceVariant }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  ›
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          /* Weather detail */
          <ScrollView contentContainerStyle={styles.weatherContent}>
            {isLoading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator
                  accessibilityLabel={`Loading weather for ${selectedPark.name}`}
                  size="large"
                />
                <Text style={[styles.stateText, { color: theme.colors.onSurfaceVariant }]}>
                  Loading weather…
                </Text>
              </View>
            ) : error ? (
              <View style={styles.centeredState}>
                <Text
                  style={[styles.errorText, { color: theme.colors.error }]}
                  accessibilityRole="alert"
                >
                  {error}
                </Text>
                <Pressable
                  onPress={handleRetry}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.primaryContainer }
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading weather"
                  accessibilityHint="Double tap to try loading the weather again."
                >
                  <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: "700" }}>
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : weatherData ? (
              <WeatherContent data={weatherData} currentRef={currentRef} />
            ) : null}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Nav bar
  navBar: {
    flexDirection:    "row",
    alignItems:       "center",
    height:           52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  navSideSlot: {
    width:            88,
    paddingHorizontal: 8,
    justifyContent:   "center",
  },
  navBackText: {
    fontSize:   16,
    fontWeight: "600",
  },
  navTitle: {
    flex:       1,
    textAlign:  "center",
    fontSize:   17,
    fontWeight: "600",
  },

  // Park picker
  parkList: {
    padding: 16,
    gap:     10,
  },
  parkListSubtitle: {
    fontSize:     15,
    lineHeight:   22,
    marginBottom: 4,
  },
  parkRow: {
    flexDirection:  "row",
    alignItems:     "center",
    padding:        16,
    borderRadius:   10,
    borderWidth:    StyleSheet.hairlineWidth,
  },
  parkRowText: {
    flex:       1,
    fontSize:   17,
    fontWeight: "500",
  },
  parkRowChevron: {
    fontSize: 22,
  },

  // Weather detail
  weatherContent: {
    padding: 16,
  },
  centeredState: {
    alignItems:     "center",
    justifyContent: "center",
    paddingTop:     80,
    gap:            16,
  },
  stateText: {
    fontSize: 16,
  },
  errorText: {
    fontSize:   16,
    textAlign:  "center",
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical:   12,
    borderRadius:       8,
  },

  // Timestamp
  updatedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  updatedAt: {
    fontSize:     12,
  },
  aboutLink: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Section headers
  sectionTitle: {
    fontSize:   16,
    fontWeight: "700",
    marginTop:  20,
    marginBottom: 8,
  },
  hourlySummary: {
    fontSize:     14,
    lineHeight:   20,
    marginTop:    -4,
    marginBottom: 10,
  },

  // Current conditions card
  currentCard: {
    borderRadius: 12,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      16,
    gap:           8,
  },
  bigTemp: {
    fontSize:   38,
    fontWeight: "700",
  },
  feelsLike: {
    fontSize: 16,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  conditionText: {
    fontSize:   20,
    lineHeight: 28,
  },

  // Details grid (UV, humidity, wind, sunset)
  detailsGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           10,
    marginTop:     12,
  },
  detailCard: {
    flexBasis:    "47%",
    flexGrow:     1,
    borderRadius: 12,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      12,
    gap:          4,
  },
  detailLabel: {
    fontSize:   12,
    fontWeight: "600",
  },
  detailValue: {
    fontSize:   16,
    fontWeight: "700",
  },

  // Forecast rows (today, tonight, 3-day)
  forecastRow: {
    flexDirection:  "row",
    alignItems:     "center",
    borderRadius:   8,
    borderWidth:    StyleSheet.hairlineWidth,
    padding:        12,
    marginBottom:   8,
    gap:            8,
  },
  dayLabel: {
    width:      76,
    fontSize:   15,
    fontWeight: "600",
  },
  forecastConditionRow: {
    flex:          1,
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  forecastCondition: {
    flex:     1,
    fontSize: 14,
    lineHeight: 20,
  },
  forecastRight: {
    alignItems: "flex-end",
    gap:        2,
  },
  forecastTemp: {
    fontSize: 13,
  },
  rainChanceRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  rainChance: {
    fontSize: 13,
  },

  // Hourly rows
  hourlyRow: {
    flexDirection:  "row",
    alignItems:     "center",
    borderRadius:   8,
    borderWidth:    StyleSheet.hairlineWidth,
    paddingVertical:   10,
    paddingHorizontal: 12,
    marginBottom:   6,
    gap:            8,
  },
  hourLabel: {
    width:    52,
    fontSize: 14,
  },
  hourTemp: {
    width:      108,
    fontSize:   14,
    fontWeight: "600",
  },
  hourConditionRow: {
    flex:          1,
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  hourCondition: {
    flex:       1,
    fontSize:   13,
    lineHeight: 18,
  },
  hourRainRow: {
    width:          56,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "flex-end",
    gap:            4,
  },
  hourRain: {
    fontSize: 13,
  },

  bottomPad: {
    height: 32,
  },
});
