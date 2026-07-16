// Phase 72 — Feedback & Community: compose a feedback email pre-filled with diagnostic info.
import { Linking, Platform } from "react-native";
import { diagnosticSummary } from "./diagnosticLogger";

const SUPPORT_EMAIL = "thomas@themickeyhouse.com";
const APP_NAME = "Main Street Gazette";

interface FeedbackOptions {
  subject?: string;
  category?: "bug" | "feature" | "accessibility" | "general";
  appVersion?: string;
  buildNumber?: number;
}

function categoryLabel(cat: FeedbackOptions["category"]): string {
  switch (cat) {
    case "bug": return "Bug Report";
    case "feature": return "Feature Request";
    case "accessibility": return "Accessibility Feedback";
    default: return "General Feedback";
  }
}

export async function openFeedbackEmail(options: FeedbackOptions = {}): Promise<boolean> {
  const { category = "general", appVersion = "unknown", buildNumber } = options;
  const label = categoryLabel(category);
  const summary = diagnosticSummary();

  const subject = options.subject ?? `[${APP_NAME}] ${label}`;

  const body = [
    `${label}`,
    ``,
    `App: ${APP_NAME} ${appVersion}${buildNumber ? ` (${buildNumber})` : ""}`,
    `iOS: ${Platform.Version}`,
    `Diagnostics: ${summary.errors} errors, ${summary.warnings} warnings (${summary.total} total events)`,
    ``,
    `--- Describe your feedback below ---`,
    ``,
  ].join("\n");

  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (!canOpen) return false;

  await Linking.openURL(url).catch(() => {});
  return true;
}

export async function openCommunityLink(): Promise<void> {
  const url = "https://ana-kennedy.github.io/mainstreetgazette/community/";
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (canOpen) await Linking.openURL(url).catch(() => {});
}
