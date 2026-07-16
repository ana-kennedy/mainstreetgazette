import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { MGNowPlaying } = NativeModules;
const isAvailable = Platform.OS === "ios" && !!MGNowPlaying;

export interface NowPlayingMetadata {
  title: string;
  artist?: string;
  duration?: number;
  elapsed?: number;
  speed?: number;
}

export type NowPlayingCommand =
  | { command: "play" }
  | { command: "pause" }
  | { command: "togglePlayPause" }
  | { command: "skipForward"; interval: number }
  | { command: "skipBackward"; interval: number };

let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (!isAvailable) return null;
  if (!emitter) emitter = new NativeEventEmitter(MGNowPlaying);
  return emitter;
}

export function setupNowPlayingRemoteCommands(): void {
  if (!isAvailable) return;
  MGNowPlaying.setupRemoteCommands();
}

export function setNowPlayingMetadata(meta: NowPlayingMetadata): void {
  if (!isAvailable) return;
  MGNowPlaying.setMetadata(meta);
}

export function updateNowPlayingElapsed(elapsed: number, speed: number): void {
  if (!isAvailable) return;
  MGNowPlaying.updateElapsed(elapsed, speed);
}

export function clearNowPlayingMetadata(): void {
  if (!isAvailable) return;
  MGNowPlaying.clearMetadata();
}

export function addNowPlayingCommandListener(
  listener: (cmd: NowPlayingCommand) => void
): { remove: () => void } {
  const em = getEmitter();
  if (!em) return { remove: () => {} };
  const sub = em.addListener("MGNowPlayingCommand", listener);
  return { remove: () => sub.remove() };
}
