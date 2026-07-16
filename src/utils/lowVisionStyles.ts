// Phase 54 — Low Vision Excellence
// Utility that generates spacing and typography adjustments based on user vision settings.
// Import and spread the result into component StyleSheets rather than hardcoding magic numbers.

import type { UserSettings } from "../domain/models";

export interface LowVisionConfig {
  lineHeight: number;
  paragraphSpacing: number;
  itemPadding: number;
  fontWeight: "400" | "600" | "700";
  metaFontWeight: "400" | "600" | "700";
}

export function getLowVisionConfig(settings: Pick<UserSettings, "lowVisionEnhancedSpacing" | "lowVisionBoldMetadata">): LowVisionConfig {
  return {
    lineHeight: settings.lowVisionEnhancedSpacing ? 26 : 20,
    paragraphSpacing: settings.lowVisionEnhancedSpacing ? 16 : 8,
    itemPadding: settings.lowVisionEnhancedSpacing ? 20 : 14,
    fontWeight: "400",
    metaFontWeight: settings.lowVisionBoldMetadata ? "700" : "400",
  };
}

export function lowVisionTextStyle(settings: Pick<UserSettings, "lowVisionEnhancedSpacing" | "lowVisionBoldMetadata">) {
  const config = getLowVisionConfig(settings);
  return {
    lineHeight: config.lineHeight,
    fontWeight: config.fontWeight,
  } as const;
}

export function lowVisionMetaStyle(settings: Pick<UserSettings, "lowVisionBoldMetadata">) {
  return {
    fontWeight: settings.lowVisionBoldMetadata ? ("700" as const) : ("400" as const),
  };
}

export function lowVisionContainerStyle(settings: Pick<UserSettings, "lowVisionEnhancedSpacing">) {
  return {
    paddingVertical: settings.lowVisionEnhancedSpacing ? 20 : 14,
    gap: settings.lowVisionEnhancedSpacing ? 10 : 6,
  } as const;
}
