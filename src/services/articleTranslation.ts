import { NativeModules, Platform } from "react-native";

const { MGTranslation } = NativeModules;

export async function isTranslationAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios" || !MGTranslation) return false;
  try {
    return await MGTranslation.isAvailable();
  } catch {
    return false;
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (Platform.OS !== "ios" || !MGTranslation) {
    throw new Error("Translation not available on this platform.");
  }
  return MGTranslation.translate(text, targetLanguage);
}
