// Phase 64 — Launch Playbook: pre-launch readiness check.
// Validates that all required configuration is present and the app is ready to ship.
// Call from a dev-tools screen or CI script; has zero effect in production.

import type { Source, UserSettings } from "../domain/models";

export type ValidationSeverity = "pass" | "warn" | "fail";

export interface ValidationResult {
  id: string;
  label: string;
  severity: ValidationSeverity;
  detail?: string;
}

export interface LaunchReport {
  results: ValidationResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  isReady: boolean;
}

export function runLaunchValidation(
  sources: Map<string, Source>,
  settings: UserSettings | null,
  itemCount: number,
): LaunchReport {
  const results: ValidationResult[] = [];

  function check(id: string, label: string, pass: boolean, warn?: boolean, detail?: string) {
    results.push({
      id,
      label,
      severity: pass ? "pass" : warn ? "warn" : "fail",
      detail,
    });
  }

  const enabledSources = Array.from(sources.values()).filter((s) => s.isEnabled);
  const officialSources = enabledSources.filter((s) => s.officialStatus === "Official");

  check("sources_count", "At least 5 enabled sources", enabledSources.length >= 5, false,
    `${enabledSources.length} enabled`);

  check("official_sources", "At least 1 official source enabled", officialSources.length >= 1, false,
    `${officialSources.length} official sources`);

  check("feed_items", "Feed has articles cached", itemCount >= 10, itemCount > 0,
    `${itemCount} items cached`);

  check("settings_present", "User settings initialised", settings !== null, false);

  check("sound_enabled_default", "Sound effects default on",
    settings?.soundEffectsEnabled !== false, true,
    settings?.soundEffectsEnabled === false ? "Sound disabled — verify intentional" : undefined);

  check("haptics_enabled_default", "Haptics default on",
    settings?.hapticsEnabled !== false, true);

  check("accessibility_level", "Default announcement level set",
    settings?.announcementLevel !== undefined, false,
    settings?.announcementLevel ?? "not set");

  const failingOrSilent = Array.from(sources.values()).filter(
    (s) => s.isEnabled && (s.lastRefreshSucceeded === false),
  );
  check("no_failing_sources", "No enabled sources in failing state",
    failingOrSilent.length === 0, false,
    failingOrSilent.length > 0 ? `${failingOrSilent.length} failing: ${failingOrSilent.map(s => s.name).join(", ")}` : undefined);

  const passCount = results.filter((r) => r.severity === "pass").length;
  const warnCount = results.filter((r) => r.severity === "warn").length;
  const failCount = results.filter((r) => r.severity === "fail").length;

  return {
    results,
    passCount,
    warnCount,
    failCount,
    isReady: failCount === 0,
  };
}
