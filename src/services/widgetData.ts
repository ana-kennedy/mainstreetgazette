import { NativeModules, Platform } from "react-native";
import type { FeedItem } from "../domain/models";

const { MGWidgetData } = NativeModules;
const isAvailable = Platform.OS === "ios" && !!MGWidgetData;

export async function updateWidgetData(
  items: FeedItem[],
  readIDs: string[],
  sourceNames: Map<string, string>
): Promise<void> {
  if (!isAvailable) return;
  const unread = items.filter((item) => !readIDs.includes(item.id));
  const latest = items[0];
  try {
    await MGWidgetData.writeData({
      unreadCount: unread.length,
      latestTitle: latest?.title ?? "",
      latestSource: latest ? (sourceNames.get(latest.sourceID) ?? "") : "",
      latestURL: latest?.canonicalURL ?? "",
      latestThumbnail: latest?.thumbnailURL ?? "",
    });
  } catch {
    // Widget data update is best-effort
  }
}
