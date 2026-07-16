import { NativeModules, Platform } from "react-native";

const { MGFoundationModels } = NativeModules;

export async function isFoundationModelsAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios" || !MGFoundationModels) return false;
  try {
    return await MGFoundationModels.isAvailable();
  } catch {
    return false;
  }
}

export async function summarizeArticle(text: string): Promise<string> {
  if (Platform.OS !== "ios" || !MGFoundationModels) {
    throw new Error("Foundation Models not available on this platform.");
  }
  return MGFoundationModels.summarize(text);
}
