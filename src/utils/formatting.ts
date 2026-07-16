import type { ContentType, FeedItem, SourceCategory, SourceType, TrustLabel } from "../domain/models";
import i18n from "../i18n";

const namedHTMLEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  hellip: "...",
  ldquo: "\"",
  lsquo: "'",
  mdash: "-",
  ndash: "-",
  nbsp: " ",
  quot: "\"",
  rdquo: "\"",
  rsquo: "'"
};

export function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#(\d+);?/g, (_match, value: string) => {
      const codePoint = Number(value);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
    })
    .replace(/&#x([0-9a-f]+);?/gi, (_match, value: string) => {
      const codePoint = Number.parseInt(value, 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => namedHTMLEntities[name.toLowerCase()] ?? match);
}

export function stripHTML(text: string): string {
  return decodeHTMLEntities(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function parseDuration(raw?: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const direct = Number(trimmed);
  if (Number.isFinite(direct)) {
    return Math.max(0, Math.round(direct));
  }
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] ?? null;
}

export function clockString(seconds?: number | null): string {
  const safe = Math.max(0, Math.round(seconds ?? 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function relativePublishedText(isoDate: string): string {
  const published = new Date(isoDate);
  if (Number.isNaN(published.getTime())) {
    return i18n.t("time.unknownDate");
  }

  const secondsAgo = Math.round((Date.now() - published.getTime()) / 1000);
  const future = secondsAgo < 0;
  const absoluteSeconds = Math.abs(secondsAgo);
  const ranges: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];

  for (const [unit, unitSeconds] of ranges) {
    if (absoluteSeconds >= unitSeconds) {
      const count = Math.max(1, Math.round(absoluteSeconds / unitSeconds));
      return future
        ? i18n.t(`time.future.${unit}`, { count })
        : i18n.t(`time.past.${unit}`, { count });
    }
  }

  return future ? i18n.t("time.soon") : i18n.t("time.justNow");
}

export function contentTypeDisplayName(type: ContentType): string {
  return i18n.t(`contentType.${type}`);
}

export function sourceTypeDisplayName(type: SourceType): string {
  return i18n.t(`sourceType.${type}`);
}

export function trustLabelDisplayName(label?: TrustLabel | null): string {
  if (label === "official") return i18n.t("trustLabel.official");
  if (label === "verifiedNews") return i18n.t("trustLabel.verifiedNews");
  return i18n.t("trustLabel.communitySource");
}

export function sourceCategoryDisplayName(category: SourceCategory): string {
  return i18n.t(`sourceCategory.${category}`, { defaultValue: category });
}

// Spoken-language versions of display strings for VoiceOver announcements.
// Visual strings use compact notation ("4 min", "2h ago"); these are natural speech.

export function a11yDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours} hour${hours > 1 ? "s" : ""} and ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

export function a11yRelativeTime(isoDate: string): string {
  // Already returns natural language — reuse relativePublishedText directly
  return relativePublishedText(isoDate);
}

export function a11ySpeed(speed: number): string {
  if (speed === 1) return "normal speed";
  if (speed === 1.5) return "one and a half times speed";
  if (speed === 0.75) return "three quarter speed";
  return `${speed} times speed`;
}

export function summarizeItem(item: FeedItem, previewLength: number): string | null {
  if (!item.summary) return null;
  const sentences = item.summary.replace(/([.!?])\s+/g, "$1|").split("|").filter(Boolean);
  if (previewLength === 0 || sentences.length <= previewLength) {
    return sentences.join(" ");
  }
  return sentences.slice(0, Math.max(1, previewLength)).join(" ") + " [...]";
}
