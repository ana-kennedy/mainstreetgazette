import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReaderDocument } from "../../types/readerTypes";
import type { ReaderCache } from "./readerService";

const STORAGE_PREFIX = "mainstreetgazette.readerDocument.";

export class AsyncStorageReaderCache implements ReaderCache {
  async get(itemId: string): Promise<ReaderDocument | undefined> {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${itemId}`).catch(() => null);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as ReaderDocument;
    } catch {
      return undefined;
    }
  }

  async put(document: ReaderDocument): Promise<void> {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${document.itemId}`, JSON.stringify(document));
  }
}
