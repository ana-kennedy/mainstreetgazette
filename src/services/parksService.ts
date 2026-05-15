const BASE_URL = "https://api.themeparks.wiki/v1";

// Keywords used to match API destination slugs/names to weather service park IDs.
// We use keyword matching rather than exact slugs because the API slugs can differ
// across API versions, and some parks (Tokyo, Hong Kong) use non-obvious slug formats.
const WEATHER_ID_TO_KEYWORDS: Record<string, string[]> = {
  wdw:  ["waltdisneyworld", "wdw"],
  dla:  ["disneylandresort", "anaheim"],
  dlp:  ["paris", "dlp"],
  tdr:  ["tokyo", "tdr"],
  shdl: ["shanghai", "shdl"],
  hkdl: ["hongkong", "hkdl"],
};

export interface ParkSummary {
  id: string;
  name: string;
}

export interface DestinationInfo {
  id: string;
  name: string;
  slug: string;
  parks: ParkSummary[];
}

export interface ParkHours {
  parkId: string;
  parkName: string;
  isOperating: boolean;
  openingTimeLabel: string;
  closingTimeLabel: string;
}

export interface WaitTimeEntry {
  id: string;
  name: string;
  status: string;
  waitMinutes: number | null;
  lastUpdated?: string;
}

export interface ParkLiveData {
  parkId: string;
  parkName: string;
  attractions: WaitTimeEntry[];
}

// Module-level cache — persists for the app lifetime (no re-fetch needed unless app restarts)
let destinationsCache: DestinationInfo[] | null = null;

export async function fetchDisneyDestinations(): Promise<DestinationInfo[]> {
  if (destinationsCache) return destinationsCache;

  const response = await fetch(`${BASE_URL}/destinations`);
  if (!response.ok) throw new Error(`Park destinations unavailable (${response.status}).`);

  const data = (await response.json()) as {
    destinations: Array<{
      id: string;
      name: string;
      slug: string;
      parks: Array<{ id: string; name: string }>;
    }>;
  };

  // Keep any destination whose slug or name contains "disney" — broader than exact-slug
  // matching so we don't miss parks whose slugs differ from what we expect.
  destinationsCache = data.destinations
    .filter((d) => {
      const combined = (d.slug + " " + d.name).toLowerCase();
      return combined.includes("disney");
    })
    .map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      parks: d.parks.map((p) => ({ id: p.id, name: p.name })),
    }));

  return destinationsCache;
}

export function getDestinationForWeatherPark(
  destinations: DestinationInfo[],
  weatherParkId: string
): DestinationInfo | null {
  const keywords = WEATHER_ID_TO_KEYWORDS[weatherParkId] ?? [];
  const match = destinations.find((d) => {
    const combined = (d.slug + " " + d.name).toLowerCase();
    return keywords.some((kw) => combined.includes(kw));
  });
  return match ?? null;
}

function formatParkTime(isoString: string | null): string {
  if (!isoString) return "—";
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (!match) return "—";
  const hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return minute === "00" ? `${displayHour} ${period}` : `${displayHour}:${minute} ${period}`;
}

// Derive the park's local "today" date string from the timezone offset embedded in
// the schedule's openingTime ISO strings (e.g. "+09:00" for Tokyo). Falls back to
// the device's UTC date if no timezone info is present.
function parkLocalTodayStr(schedule: Array<{ openingTime?: string | null }>): string {
  for (const entry of schedule) {
    const ot = entry.openingTime;
    if (!ot) continue;
    const match = ot.match(/([+-])(\d{2}):(\d{2})$/);
    if (!match) continue;
    const sign = match[1] === "+" ? 1 : -1;
    const offsetMs = sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10)) * 60_000;
    return new Date(Date.now() + offsetMs).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

type ScheduleEntry = { date: string; openingTime: string | null; closingTime: string | null; type: string };

async function fetchScheduleEntries(parkId: string, year: number, month: number): Promise<ScheduleEntry[]> {
  const response = await fetch(`${BASE_URL}/entity/${parkId}/schedule?year=${year}&month=${month}`);
  if (!response.ok) throw new Error(`Schedule unavailable (${response.status}).`);
  const data = (await response.json()) as { schedule?: ScheduleEntry[] };
  return data.schedule ?? [];
}

export async function fetchParkHours(park: ParkSummary): Promise<ParkHours> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  let schedule = await fetchScheduleEntries(park.id, year, month);
  const todayStr = parkLocalTodayStr(schedule);

  // If the park-local date has rolled into the next month, fetch that month too.
  const scheduleMonth = schedule[0]?.date?.slice(0, 7);
  if (scheduleMonth && !todayStr.startsWith(scheduleMonth)) {
    const nextMonthDate = new Date(Date.UTC(year, month, 1)); // month is 1-based, so this is the 1st of next month
    const extraSchedule = await fetchScheduleEntries(
      park.id,
      nextMonthDate.getUTCFullYear(),
      nextMonthDate.getUTCMonth() + 1
    ).catch(() => [] as ScheduleEntry[]);
    schedule = [...schedule, ...extraSchedule];
  }

  const entry = schedule.find((s) => s.date === todayStr && s.type === "OPERATING");

  if (!entry) {
    return { parkId: park.id, parkName: park.name, isOperating: false, openingTimeLabel: "Closed", closingTimeLabel: "—" };
  }

  return {
    parkId: park.id,
    parkName: park.name,
    isOperating: true,
    openingTimeLabel: formatParkTime(entry.openingTime),
    closingTimeLabel: formatParkTime(entry.closingTime),
  };
}

export async function fetchParkLiveData(park: ParkSummary): Promise<ParkLiveData> {
  const response = await fetch(`${BASE_URL}/entity/${park.id}/live`);
  if (!response.ok) throw new Error(`Live data unavailable for ${park.name} (${response.status}).`);

  const data = (await response.json()) as {
    liveData?: Array<{
      id: string;
      name: string;
      entityType: string;
      status: string;
      lastUpdated?: string;
      queue?: { STANDBY?: { waitTime: number | null } };
    }>;
  };

  const attractions: WaitTimeEntry[] = (data.liveData ?? [])
    .filter((item) => item.entityType === "ATTRACTION")
    .map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      waitMinutes: item.queue?.STANDBY?.waitTime ?? null,
      lastUpdated: item.lastUpdated,
    }))
    .sort((a, b) => {
      const aOp = a.status === "OPERATING";
      const bOp = b.status === "OPERATING";
      if (aOp && !bOp) return -1;
      if (!aOp && bOp) return 1;
      if (a.waitMinutes !== null && b.waitMinutes !== null) return b.waitMinutes - a.waitMinutes;
      if (a.waitMinutes !== null) return -1;
      if (b.waitMinutes !== null) return 1;
      return a.name.localeCompare(b.name);
    });

  return { parkId: park.id, parkName: park.name, attractions };
}
