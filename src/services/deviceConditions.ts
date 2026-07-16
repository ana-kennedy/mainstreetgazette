// Phase 06 — Living Gazette Library: device/network conditions that gate the extra
// adaptive backfill batches. The baseline "fetch latest per source" refresh never
// checks any of this — only the additional backfill work backs off when conditions
// are unfavorable, per the phase spec's "Conditions" section.
import * as Battery from "expo-battery";
import { fetchNetworkState } from "../hooks/useNetworkState";
import type { UserSettings } from "../domain/models";

export type BackfillSkipReason = "lowPowerMode" | "cellular" | "poorConnection" | "thermalBackoff";

export interface BackfillConditions {
  allowBackfill: boolean;
  reason?: BackfillSkipReason;
}

// True thermal-state APIs aren't available cross-platform without a custom native
// module. As a documented, deliberate approximation, we back off after several
// consecutive slow/failed background runs instead — a proxy for sustained device
// pressure, not a real thermal reading.
const THERMAL_BACKOFF_THRESHOLD = 3;
let consecutiveSlowOrFailedRuns = 0;

export function recordBackgroundRunOutcome(wasSlowOrFailed: boolean): void {
  consecutiveSlowOrFailedRuns = wasSlowOrFailed ? consecutiveSlowOrFailedRuns + 1 : 0;
}

export async function evaluateBackfillConditions(
  settings: Pick<UserSettings, "growLibraryWifiOnly">
): Promise<BackfillConditions> {
  try {
    const lowPowerMode = await Battery.isLowPowerModeEnabledAsync();
    if (lowPowerMode) return { allowBackfill: false, reason: "lowPowerMode" };
  } catch {
    // expo-battery unavailable on this platform (e.g. web) — don't block on it.
  }

  if (consecutiveSlowOrFailedRuns >= THERMAL_BACKOFF_THRESHOLD) {
    return { allowBackfill: false, reason: "thermalBackoff" };
  }

  const network = await fetchNetworkState();
  if (network.isSlowConnection) {
    return { allowBackfill: false, reason: "poorConnection" };
  }
  if (settings.growLibraryWifiOnly && network.connectionType === "cellular") {
    return { allowBackfill: false, reason: "cellular" };
  }

  return { allowBackfill: true };
}
