import { useEffect, useRef } from "react";
import { NativeModules, NativeEventEmitter, Platform } from "react-native";

export interface KeyCommandHandlers {
  onRefresh?: () => void;
  onFind?: () => void;
  onTabChange?: (index: number) => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyCommandHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const { MGKeyboardShortcuts } = NativeModules;
    if (!MGKeyboardShortcuts) return;

    MGKeyboardShortcuts.install();

    const emitter = new NativeEventEmitter(MGKeyboardShortcuts);
    const sub = emitter.addListener("MGKeyCommand", (event: { command: string }) => {
      const h = handlersRef.current;
      const { command } = event;
      if (command === "refresh") h.onRefresh?.();
      else if (command === "find") h.onFind?.();
      else if (command === "save") h.onSave?.();
      else if (command.startsWith("tab:")) {
        const idx = parseInt(command.replace("tab:", ""), 10);
        h.onTabChange?.(idx);
      }
    });

    return () => sub.remove();
  }, []);
}
