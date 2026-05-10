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
}

export interface WeatherCodeInfo {
  label: string;
  emoji: string;
}

export function describeWeatherCode(code: number): WeatherCodeInfo {
  if (code === 0)                         return { label: "Clear sky",                emoji: "☀️"  };
  if (code === 1)                         return { label: "Mainly clear",             emoji: "🌤"  };
  if (code === 2)                         return { label: "Partly cloudy",            emoji: "⛅"  };
  if (code === 3)                         return { label: "Overcast",                 emoji: "☁️"  };
  if (code === 45 || code === 48)         return { label: "Foggy",                    emoji: "🌫"  };
  if (code >= 51 && code <= 55)           return { label: "Drizzle",                  emoji: "🌦"  };
  if (code === 56 || code === 57)         return { label: "Freezing drizzle",         emoji: "🌨"  };
  if (code >= 61 && code <= 65)           return { label: "Rain",                     emoji: "🌧"  };
  if (code === 66 || code === 67)         return { label: "Freezing rain",            emoji: "🌨"  };
  if (code >= 71 && code <= 75)           return { label: "Snow",                     emoji: "❄️"  };
  if (code === 77)                        return { label: "Snow grains",              emoji: "🌨"  };
  if (code >= 80 && code <= 82)           return { label: "Rain showers",             emoji: "🌦"  };
  if (code === 85 || code === 86)         return { label: "Snow showers",             emoji: "🌨"  };
  if (code === 95)                        return { label: "Thunderstorm",             emoji: "⛈"  };
  if (code === 96 || code === 99)         return { label: "Thunderstorm with hail",   emoji: "⛈"  };
  return                                           { label: "Conditions unavailable",  emoji: "🌡"  };
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

export function tempDisplay(fahrenheit: number): string {
  return `${Math.round(fahrenheit)}°F / ${fToC(fahrenheit)}°C`;
}

export function tempAccessText(fahrenheit: number): string {
  return `${Math.round(fahrenheit)} degrees Fahrenheit, ${fToC(fahrenheit)} Celsius`;
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
  };
}

export async function fetchWeatherForPark(park: ParkInfo): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude:         park.latitude.toString(),
    longitude:        park.longitude.toString(),
    current:          "temperature_2m,apparent_temperature,weathercode,uv_index",
    hourly:           "temperature_2m,precipitation_probability,weathercode",
    daily:            "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
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

  // Hourly today at 3-hour intervals
  const hourlyIndices = [0, 3, 6, 9, 12, 15, 18, 21];

  return {
    park,
    fetchedAt: new Date(),
    current: {
      temperatureF: raw.current.temperature_2m,
      feelsLikeF:   raw.current.apparent_temperature,
      weatherCode:  raw.current.weathercode,
      uvIndex:      raw.current.uv_index,
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
      timeLabel:           hourLabel(i),
      temperatureF:        raw.hourly.temperature_2m[i],
      weatherCode:         raw.hourly.weathercode[i],
      precipitationChance: raw.hourly.precipitation_probability[i],
    })),
  };
}
