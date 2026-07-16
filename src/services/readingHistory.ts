// Phase 58 — Reader Experience: reading history and "continue reading" tracking.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@msg/readingHistory";
const MAX_HISTORY = 100;

export interface ReadingHistoryEntry {
  itemId: string;
  openedAt: string;
  progressPct: number;
  isCompleted: boolean;
}

async function loadHistory(): Promise<Record<string, ReadingHistoryEntry>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveHistory(history: Record<string, ReadingHistoryEntry>): Promise<void> {
  const entries = Object.entries(history)
    .sort((a, b) => b[1].openedAt.localeCompare(a[1].openedAt))
    .slice(0, MAX_HISTORY);
  const trimmed = Object.fromEntries(entries);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)).catch(() => {});
}

export async function recordArticleOpen(itemId: string): Promise<void> {
  const history = await loadHistory();
  const existing = history[itemId];
  history[itemId] = {
    itemId,
    openedAt: new Date().toISOString(),
    progressPct: existing?.progressPct ?? 0,
    isCompleted: existing?.isCompleted ?? false,
  };
  await saveHistory(history);
}

export async function updateReadingProgress(itemId: string, progressPct: number): Promise<void> {
  const history = await loadHistory();
  const existing = history[itemId];
  history[itemId] = {
    itemId,
    openedAt: existing?.openedAt ?? new Date().toISOString(),
    progressPct,
    isCompleted: progressPct >= 0.9,
  };
  await saveHistory(history);
}

export async function getRecentlyRead(limit = 10): Promise<ReadingHistoryEntry[]> {
  const history = await loadHistory();
  return Object.values(history)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .slice(0, limit);
}

export async function hasBeenRead(itemId: string): Promise<boolean> {
  const history = await loadHistory();
  return !!history[itemId];
}

export async function clearReadingHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
