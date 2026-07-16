import { NativeModules, Platform } from "react-native";
import type { FeedItem } from "../domain/models";

const { MGSpotlight } = NativeModules;
const isAvailable = Platform.OS === "ios" && !!MGSpotlight;

export async function indexFeedItems(items: FeedItem[]): Promise<void> {
  if (!isAvailable) return;
  const payload = items.slice(0, 200).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary ?? undefined,
    url: item.canonicalURL,
    thumbnailURL: item.thumbnailURL ?? undefined,
    publishedAt: item.publishedAt,
  }));
  try {
    await MGSpotlight.indexItems(payload);
  } catch {
    // Spotlight indexing is best-effort
  }
}

export async function clearSpotlightIndex(): Promise<void> {
  if (!isAvailable) return;
  try {
    await MGSpotlight.deleteAllItems();
  } catch {}
}
