export interface ParkInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const DISNEY_PARKS: ParkInfo[] = [
  { id: "wdw",  name: "Walt Disney World, Orlando",   latitude: 28.3852,  longitude: -81.5639  },
  { id: "dla",  name: "Disneyland, Anaheim",          latitude: 33.8121,  longitude: -117.9190 },
  { id: "dlp",  name: "Disneyland Paris",             latitude: 48.8674,  longitude: 2.7836    },
  { id: "tdr",  name: "Tokyo Disneyland",             latitude: 35.6329,  longitude: 139.8804  },
  { id: "shdl", name: "Shanghai Disneyland",          latitude: 31.1440,  longitude: 121.6570  },
  { id: "hkdl", name: "Hong Kong Disneyland",         latitude: 22.3130,  longitude: 114.0413  },
];

export interface CurrentConditions {
  temperatureF: number;
  feelsLikeF: number;
  weatherCode: number;
  uvIndex: number;
  humidityPercent: number;
  windSpeedMph: number;
  windDirectionDeg: number;
}

export interface TonightConditions {
  weatherCode: number;
  lowF: number;
  precipitationChance: number;
}

export interface DailyForecast {
  dateLabel: string;
  weatherCode: number;
  highF: number;
  lowF: number;
  precipitationChance: number;
}

export interface HourlySlot {
  hour: number;
  timeLabel: string;
  temperatureF: number;
  weatherCode: number;
  precipitationChance: number;
}

export interface WeatherData {
  park: ParkInfo;
  fetchedAt: Date;
  current: CurrentConditions;
  tonight: TonightConditions;
  today: DailyForecast;
  nextThreeDays: DailyForecast[];
  hourlyToday: HourlySlot[];
  sunriseLabel: string;
  sunsetLabel: string;
}

export interface WeatherCodeInfo {
  label: string;
  emoji: string;
  icon: string;
}

export function describeWeatherCode(code: number, isNight = false): WeatherCodeInfo {
  if (code === 0)                         return { label: "Clear sky",                emoji: "☀️", icon: isNight ? "weather-night" : "weather-sunny" };
  if (code === 1)                         return { label: "Mainly clear",             emoji: "🌤",  icon: isNight ? "weather-night-partly-cloudy" : "weather-partly-cloudy" };
  if (code === 2)                         return { label: "Partly cloudy",            emoji: "⛅", icon: isNight ? "weather-night-partly-cloudy" : "weather-partly-cloudy" };
  if (code === 3)                         return { label: "Overcast",                 emoji: "☁️", icon: "weather-cloudy" };
  if (code === 45 || code === 48)         return { label: "Foggy",                    emoji: "🌫",  icon: "weather-fog" };
  if (code >= 51 && code <= 55)           return { label: "Drizzle",                  emoji: "🌦",  icon: "weather-partly-rainy" };
  if (code === 56 || code === 57)         return { label: "Freezing drizzle",         emoji: "🌨",  icon: "weather-snowy-rainy" };
  if (code >= 61 && code <= 65)           return { label: "Rain",                     emoji: "🌧",  icon: "weather-rainy" };
  if (code === 66 || code === 67)         return { label: "Freezing rain",            emoji: "🌨",  icon: "weather-snowy-rainy" };
  if (code >= 71 && code <= 75)           return { label: "Snow",                     emoji: "❄️", icon: "weather-snowy" };
  if (code === 77)                        return { label: "Snow grains",              emoji: "🌨",  icon: "weather-snowy" };
  if (code >= 80 && code <= 82)           return { label: "Rain showers",             emoji: "🌦",  icon: "weather-pouring" };
  if (code === 85 || code === 86)         return { label: "Snow showers",             emoji: "🌨",  icon: "weather-snowy-heavy" };
  if (code === 95)                        return { label: "Thunderstorm",             emoji: "⛈",  icon: "weather-lightning" };
  if (code === 96 || code === 99)         return { label: "Thunderstorm with hail",   emoji: "⛈",  icon: "weather-hail" };
  return                                           { label: "Conditions unavailable",  emoji: "🌡",  icon: "thermometer" };
}

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function windDirectionLabel(degrees: number): string {
  const idx = Math.round(degrees / 45) % 8;
  return COMPASS_POINTS[idx];
}

const COMPASS_ACCESS_NAMES: Record<string, string> = {
  N: "north", NE: "northeast", E: "east", SE: "southeast",
  S: "south", SW: "southwest", W: "west", NW: "northwest",
};

export function windDisplay(speedMph: number, directionDeg: number): string {
  return `${Math.round(speedMph)} mph ${windDirectionLabel(directionDeg)}`;
}

export function windAccessText(speedMph: number, directionDeg: number): string {
  const compass = windDirectionLabel(directionDeg);
  return `${Math.round(speedMph)} miles per hour from the ${COMPASS_ACCESS_NAMES[compass]}`;
}

export function humidityAccessText(percent: number): string {
  return `${Math.round(percent)} percent humidity`;
}

export function uvIndexLabel(index: number): string {
  const n = Math.round(index);
  if (n <= 2)  return "Low";
  if (n <= 5)  return "Moderate";
  if (n <= 7)  return "High";
  if (n <= 10) return "Very high";
  return "Extreme";
}

export function fToC(fahrenheit: number): number {
  return Math.round((fahrenheit - 32) * 5 / 9);
}

// Phase 07: which unit(s) to actually display. "both" preserves this app's original
// display (used wherever a caller hasn't resolved a user preference yet); "fahrenheit"/
// "celsius" are the single-unit choices the Explore Disney settings group offers.
export type WeatherDisplayUnit = "fahrenheit" | "celsius" | "both";

export function tempDisplay(fahrenheit: number, unit: WeatherDisplayUnit = "both"): string {
  if (unit === "fahrenheit") return `${Math.round(fahrenheit)}°F`;
  if (unit === "celsius") return `${fToC(fahrenheit)}°C`;
  return `${Math.round(fahrenheit)}°F / ${fToC(fahrenheit)}°C`;
}

export function tempAccessText(fahrenheit: number, unit: WeatherDisplayUnit = "both"): string {
  if (unit === "fahrenheit") return `${Math.round(fahrenheit)} degrees Fahrenheit`;
  if (unit === "celsius") return `${fToC(fahrenheit)} degrees Celsius`;
  return `${Math.round(fahrenheit)} degrees Fahrenheit, ${fToC(fahrenheit)} Celsius`;
}

// "auto" (the default) follows the device's region — US-style Fahrenheit-primary
// locales get Fahrenheit, everyone else gets Celsius — rather than always showing
// both units, per the spec's "follow iPhone by default, optional override."
const FAHRENHEIT_REGION_CODES = new Set(["US", "LR", "MM", "BS", "BZ", "KY", "PW"]);

export function resolveWeatherUnit(preference: "auto" | "fahrenheit" | "celsius"): "fahrenheit" | "celsius" {
  if (preference === "fahrenheit" || preference === "celsius") return preference;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Localization = require("expo-localization");
    const region = Localization.getLocales?.()[0]?.regionCode;
    return region && FAHRENHEIT_REGION_CODES.has(region) ? "fahrenheit" : "celsius";
  } catch {
    return "fahrenheit";
  }
}

function modeOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const freq: Record<number, number> = {};
  for (const v of arr) freq[v] = (freq[v] ?? 0) + 1;
  let best = arr[0];
  let bestCount = 0;
  for (const [k, count] of Object.entries(freq)) {
    if (count > bestCount) { bestCount = count; best = Number(k); }
  }
  return best;
}

function hourLabel(hour: number): string {
  if (hour === 0)  return "12 AM";
  if (hour === 12) return "Noon";
  if (hour < 12)   return `${hour} AM`;
  return `${hour - 12} PM`;
}

function dayLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weathercode: number;
    uv_index: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weathercode: number[];
  };
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export async function fetchWeatherForPark(park: ParkInfo): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude:         park.latitude.toString(),
    longitude:        park.longitude.toString(),
    current:          "temperature_2m,apparent_temperature,weathercode,uv_index,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
    hourly:           "temperature_2m,precipitation_probability,weathercode",
    daily:            "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    temperature_unit: "fahrenheit",
    wind_speed_unit:  "mph",
    timezone:         "auto",
    forecast_days:    "4",
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error(`Weather service returned status ${response.status}.`);
  const raw = (await response.json()) as OpenMeteoResponse;

  // "Tonight" = 6 PM – 11 PM (hourly indices 18–23)
  const tonightIdx = [18, 19, 20, 21, 22, 23];
  const tonightTemps  = tonightIdx.map(i => raw.hourly.temperature_2m[i]);
  const tonightCodes  = tonightIdx.map(i => raw.hourly.weathercode[i]);
  const tonightPrecip = tonightIdx.map(i => raw.hourly.precipitation_probability[i]);

  // Hourly today, every hour — the UI decides how much of this to show
  // (e.g. trimmed to a park's operating hours, or sampled every 3 hours).
  const hourlyIndices = Array.from({ length: 24 }, (_, i) => i);

  return {
    park,
    fetchedAt: new Date(),
    current: {
      temperatureF:     raw.current.temperature_2m,
      feelsLikeF:       raw.current.apparent_temperature,
      weatherCode:      raw.current.weathercode,
      uvIndex:          raw.current.uv_index,
      humidityPercent:  raw.current.relative_humidity_2m,
      windSpeedMph:     raw.current.wind_speed_10m,
      windDirectionDeg: raw.current.wind_direction_10m,
    },
    tonight: {
      weatherCode:        modeOf(tonightCodes),
      lowF:               Math.min(...tonightTemps),
      precipitationChance: Math.max(...tonightPrecip),
    },
    today: {
      dateLabel:           "Today",
      weatherCode:         raw.daily.weathercode[0],
      highF:               raw.daily.temperature_2m_max[0],
      lowF:                raw.daily.temperature_2m_min[0],
      precipitationChance: raw.daily.precipitation_probability_max[0],
    },
    nextThreeDays: [1, 2, 3].map(offset => ({
      dateLabel:           dayLabel(offset),
      weatherCode:         raw.daily.weathercode[offset],
      highF:               raw.daily.temperature_2m_max[offset],
      lowF:                raw.daily.temperature_2m_min[offset],
      precipitationChance: raw.daily.precipitation_probability_max[offset],
    })),
    hourlyToday: hourlyIndices.map(i => ({
      hour:                i,
      timeLabel:           hourLabel(i),
      temperatureF:        raw.hourly.temperature_2m[i],
      weatherCode:         raw.hourly.weathercode[i],
      precipitationChance: raw.hourly.precipitation_probability[i],
    })),
    sunriseLabel: timeLabel(raw.daily.sunrise[0]),
    sunsetLabel:  timeLabel(raw.daily.sunset[0]),
  };
}

// ─── Hourly display selection & summary ────────────────────────────────────────

interface ParkOperatingWindow {
  isOperating: boolean;
  openingHour24: number | null;
  closingHour24: number | null;
}

/**
 * Picks which hourly slots to show. When park hours are known and the park is
 * open today, trims to the operating window ± 1 hour so the list only covers
 * hours a guest would actually be there. Otherwise falls back to a 3-hour-interval
 * sample across the whole day (used by the standalone resort weather modal, which
 * isn't tied to one specific park's schedule).
 */
export function selectDisplayHours(
  hourlyToday: HourlySlot[],
  parkHours?: ParkOperatingWindow | null
): HourlySlot[] {
  if (parkHours?.isOperating && parkHours.openingHour24 != null && parkHours.closingHour24 != null) {
    const start = Math.max(0, Math.floor(parkHours.openingHour24) - 1);
    const wrapsPastMidnight = parkHours.closingHour24 < parkHours.openingHour24;
    const end = wrapsPastMidnight ? 23 : Math.min(23, Math.ceil(parkHours.closingHour24) + 1);
    const trimmed = hourlyToday.filter(s => s.hour >= start && s.hour <= end);
    if (trimmed.length > 0) return trimmed;
  }
  return hourlyToday.filter(s => s.hour % 3 === 0);
}

/** One-line takeaway for a set of hourly slots: rain timing + warmest hour. */
export function summarizeHourly(slots: HourlySlot[]): string {
  if (slots.length === 0) return "";

  let warmest = slots[0];
  for (const s of slots) {
    if (s.temperatureF > warmest.temperatureF) warmest = s;
  }

  const startsWet = slots[0].precipitationChance >= 50;
  const rainOnset = slots.find(s => s.precipitationChance >= 50);

  let rainPart: string;
  if (startsWet) {
    rainPart = "Rain likely for much of this window";
  } else if (rainOnset) {
    rainPart = `Rain likely after ${rainOnset.timeLabel}`;
  } else {
    rainPart = "No rain expected";
  }

  return `${rainPart} · Warmest around ${warmest.timeLabel} at ${tempDisplay(warmest.temperatureF)}`;
}

// ─── Weather alerts (US National Weather Service) ─────────────────────────────
//
// api.weather.gov only covers US territory, so alerts are only available for
// parks whose ParkInfo.id is in US_ALERT_PARK_IDS (Walt Disney World, Disneyland).
// International parks silently return an empty list — there's no free/keyless
// equivalent source for those, so we don't fake coverage.

const US_ALERT_PARK_IDS = new Set(["wdw", "dla"]);

export function supportsWeatherAlerts(park: ParkInfo): boolean {
  return US_ALERT_PARK_IDS.has(park.id);
}

export type AlertSeverity = "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";

export interface WeatherAlert {
  id: string;
  event: string;
  severity: AlertSeverity;
  headline: string;
  description: string;
  expiresLabel: string;
}

interface NwsAlertsResponse {
  features: Array<{
    id: string;
    properties: {
      event: string;
      severity: string;
      headline: string | null;
      description: string;
      expires: string;
    };
  }>;
}

export async function fetchActiveWeatherAlerts(park: ParkInfo): Promise<WeatherAlert[]> {
  if (!supportsWeatherAlerts(park)) return [];

  const params = new URLSearchParams({
    point:  `${park.latitude},${park.longitude}`,
    status: "actual",
  });

  const response = await fetch(`https://api.weather.gov/alerts/active?${params.toString()}`, {
    headers: {
      Accept:       "application/geo+json",
      "User-Agent": "MainStreetGazette/1.0.7 (com.mainstreetgazette.app)",
    },
  });
  if (!response.ok) throw new Error(`Weather alerts service returned status ${response.status}.`);
  const raw = (await response.json()) as NwsAlertsResponse;

  return raw.features.map(f => ({
    id:           f.id,
    event:        f.properties.event,
    severity:     isAlertSeverity(f.properties.severity) ? f.properties.severity : "Unknown",
    headline:     f.properties.headline ?? f.properties.event,
    description:  f.properties.description,
    expiresLabel: new Date(f.properties.expires).toLocaleString("en-US", {
      weekday: "short", hour: "numeric", minute: "2-digit",
    }),
  }));
}

function isAlertSeverity(value: string): value is AlertSeverity {
  return value === "Extreme" || value === "Severe" || value === "Moderate" || value === "Minor" || value === "Unknown";
}
