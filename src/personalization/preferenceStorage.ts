import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultPersonalizationPreferences } from "./preferenceDefaults";
import type { UserPersonalizationPreferences } from "./personalizationTypes";

const STORAGE_KEY = "mainStreetGazette.personalization.v1";

export async function loadPersonalizationPreferences(): Promise<UserPersonalizationPreferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultPersonalizationPreferences;
  try {
    const parsed = JSON.parse(raw) as Partial<UserPersonalizationPreferences>;
    return {
      ...defaultPersonalizationPreferences,
      ...parsed,
      accessibility: {
        ...defaultPersonalizationPreferences.accessibility,
        ...(parsed.accessibility ?? {}),
      },
    };
  } catch {
    return defaultPersonalizationPreferences;
  }
}

export async function savePersonalizationPreferences(
  prefs: UserPersonalizationPreferences
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export async function resetPersonalizationPreferences(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
