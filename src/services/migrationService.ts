// Phase 77 — Migration & Data Evolution: versioned migration runner for settings and cache.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logDiagnostic } from "./diagnosticLogger";

const SCHEMA_VERSION_KEY = "@msg/schemaVersion";
const CURRENT_SCHEMA_VERSION = 3;

export interface Migration {
  version: number;
  description: string;
  run: () => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Add soundEffectsEnabled default to settings",
    run: async () => {
      const raw = await AsyncStorage.getItem("@msg/userSettings").catch(() => null);
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings.soundEffectsEnabled === undefined) {
        settings.soundEffectsEnabled = true;
        await AsyncStorage.setItem("@msg/userSettings", JSON.stringify(settings));
      }
    },
  },
  {
    version: 2,
    description: "Add hapticsEnabled default to settings",
    run: async () => {
      const raw = await AsyncStorage.getItem("@msg/userSettings").catch(() => null);
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings.hapticsEnabled === undefined) {
        settings.hapticsEnabled = true;
        await AsyncStorage.setItem("@msg/userSettings", JSON.stringify(settings));
      }
    },
  },
  {
    version: 3,
    description: "Add announcementLevel default to settings",
    run: async () => {
      const raw = await AsyncStorage.getItem("@msg/userSettings").catch(() => null);
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings.announcementLevel === undefined) {
        settings.announcementLevel = "normal";
        await AsyncStorage.setItem("@msg/userSettings", JSON.stringify(settings));
      }
    },
  },
];

async function getSchemaVersion(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

async function setSchemaVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(version)).catch(() => {});
}

export async function runMigrations(): Promise<{ applied: number; errors: number }> {
  const currentVersion = await getSchemaVersion();
  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);

  let applied = 0;
  let errors = 0;

  for (const migration of pending) {
    try {
      await migration.run();
      await setSchemaVersion(migration.version);
      applied++;
      logDiagnostic("info", "migration", `Applied migration v${migration.version}: ${migration.description}`);
    } catch (err) {
      errors++;
      logDiagnostic("error", "migration", `Migration v${migration.version} failed`, String(err));
    }
  }

  return { applied, errors };
}

export function getCurrentSchemaVersion(): number {
  return CURRENT_SCHEMA_VERSION;
}

export function getMigrationCount(): number {
  return MIGRATIONS.length;
}
