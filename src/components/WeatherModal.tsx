import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  findNodeHandle
} from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DISNEY_PARKS,
  ParkInfo,
  WeatherData,
  describeWeatherCode,
  fetchWeatherForPark,
  tempAccessText,
  tempDisplay,
  uvIndexLabel,
} from "../services/weatherService";

interface WeatherModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Weather content sections ────────────────────────────────────────────────

export interface WeatherContentProps {
  data: WeatherData;
  currentRef: React.RefObject<View | null>;
}

// Keep internal alias for the component's own usage
type SectionProps = WeatherContentProps;

export function WeatherContent({ data, currentRef }: SectionProps) {
  const theme = useTheme();
  const { current, tonight, today, nextThreeDays, hourlyToday } = data;
  const currentDesc = describeWeatherCode(current.weatherCode);
  const tonightDesc  = describeWeatherCode(tonight.weatherCode);

  const updatedLabel = data.fetchedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      {/* ── Updated timestamp ── */}
      <Text
        style={[styles.updatedAt, { color: theme.colors.onSurfaceVariant }]}
        accessibilityLabel={`Last updated: ${updatedLabel}`}
      >
        Updated {updatedLabel}
      </Text>

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
          `Temperature: ${tempAccessText(current.temperatureF)}. ` +
          `Feels like ${tempAccessText(current.feelsLikeF)}. ` +
          `${currentDesc.label}. ` +
          `UV index ${Math.round(current.uvIndex)}, ${uvIndexLabel(current.uvIndex)}.`
        }
      >
        <Text
          style={[styles.bigTemp, { color: theme.colors.onSurface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {tempDisplay(current.temperatureF)}
        </Text>
        <Text
          style={[styles.feelsLike, { color: theme.colors.onSurfaceVariant }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          Feels like {tempDisplay(current.feelsLikeF)}
        </Text>
        <Text
          style={[styles.conditionText, { color: theme.colors.onSurface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {currentDesc.emoji}{"  "}{currentDesc.label}
        </Text>
        <Text
          style={[styles.uvText, { color: theme.colors.onSurfaceVariant }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          UV {Math.round(current.uvIndex)} · {uvIndexLabel(current.uvIndex)}
        </Text>
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
              `High ${tempAccessText(today.highF)}, low ${tempAccessText(today.lowF)}. ` +
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
            <Text
              style={[styles.forecastCondition, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {d.emoji}{"  "}{d.label}
            </Text>
            <View
              style={styles.forecastRight}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>H: {tempDisplay(today.highF)}</Text>
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>L: {tempDisplay(today.lowF)}</Text>
              <Text style={[styles.rainChance, { color: theme.colors.onSurfaceVariant }]}>🌧  {today.precipitationChance}%</Text>
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
          `Low ${tempAccessText(tonight.lowF)}. ` +
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
        <Text
          style={[styles.forecastCondition, { color: theme.colors.onSurface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {tonightDesc.emoji}{"  "}{tonightDesc.label}
        </Text>
        <View
          style={styles.forecastRight}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>L: {tempDisplay(tonight.lowF)}</Text>
          <Text style={[styles.rainChance, { color: theme.colors.onSurfaceVariant }]}>🌧  {tonight.precipitationChance}%</Text>
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
              `High ${tempAccessText(day.highF)}, low ${tempAccessText(day.lowF)}. ` +
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
            <Text
              style={[styles.forecastCondition, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {d.emoji}{"  "}{d.label}
            </Text>
            <View
              style={styles.forecastRight}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>H: {tempDisplay(day.highF)}</Text>
              <Text style={[styles.forecastTemp, { color: theme.colors.onSurface }]}>L: {tempDisplay(day.lowF)}</Text>
              <Text style={[styles.rainChance, { color: theme.colors.onSurfaceVariant }]}>🌧  {day.precipitationChance}%</Text>
            </View>
          </View>
        );
      })}

      {/* ── Today Hourly (every 3 hours) ── */}
      <Text
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
        accessibilityRole="header"
      >
        Today Hourly
      </Text>
      {hourlyToday.map(slot => {
        const d = describeWeatherCode(slot.weatherCode);
        return (
          <View
            key={slot.timeLabel}
            accessible
            style={[styles.hourlyRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            accessibilityLabel={
              `${slot.timeLabel}. ${tempAccessText(slot.temperatureF)}. ` +
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
              {tempDisplay(slot.temperatureF)}
            </Text>
            <Text
              style={[styles.hourCondition, { color: theme.colors.onSurface }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {d.emoji}{"  "}{d.label}
            </Text>
            <Text
              style={[styles.hourRain, { color: theme.colors.onSurfaceVariant }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              🌧  {slot.precipitationChance}%
            </Text>
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
  const [selectedPark, setSelectedPark] = useState<ParkInfo | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setSelectedPark(null);
      setWeatherData(null);
      setError(null);
    } else {
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
      <View
        style={[
          styles.screen,
          {
            backgroundColor: theme.colors.background,
            paddingTop:    insets.top,
            paddingBottom: insets.bottom,
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
      </View>
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
  updatedAt: {
    fontSize:     12,
    textAlign:    "right",
    marginBottom: 4,
  },

  // Section headers
  sectionTitle: {
    fontSize:   16,
    fontWeight: "700",
    marginTop:  20,
    marginBottom: 8,
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
  conditionText: {
    fontSize:   20,
    lineHeight: 28,
  },
  uvText: {
    fontSize: 15,
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
  hourCondition: {
    flex:       1,
    fontSize:   13,
    lineHeight: 18,
  },
  hourRain: {
    width:    56,
    fontSize: 13,
    textAlign: "right",
  },

  bottomPad: {
    height: 32,
  },
});
