import type { ContentType, FeedItem, SourceCategory, SourceType, TrustLabel } from "../domain/models";

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
    return "Published date unknown.";
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
      const value = Math.max(1, Math.round(absoluteSeconds / unitSeconds));
      const pluralized = value === 1 ? unit : `${unit}s`;
      return future ? `Published in ${value} ${pluralized}.` : `Published ${value} ${pluralized} ago.`;
    }
  }

  return future ? "Published soon." : "Published just now.";
}

export function contentTypeDisplayName(type: ContentType): string {
  if (type === "article") return "Article";
  if (type === "video") return "Video";
  return "Podcast";
}

export function sourceTypeDisplayName(type: SourceType): string {
  if (type === "rssArticle") return "News";
  if (type === "youtubeChannel") return "Video";
  if (type === "redditFeed") return "Social";
  return "Podcast";
}

export function trustLabelDisplayName(label?: TrustLabel | null): string {
  if (label === "official") return "Official";
  if (label === "verifiedNews") return "Verified News";
  return "Community Source";
}

export function sourceCategoryDisplayName(category: SourceCategory): string {
  const labels: Record<SourceCategory, string> = {
    parksNews: "Parks News",
    food: "Food",
    planning: "Planning",
    hotels: "Hotels",
    attractions: "Attractions",
    video: "Video",
    podcast: "Podcast",
    official: "Official",
    community: "Community",
    social: "Social"
  };
  return labels[category] ?? category;
}

export function summarizeItem(item: FeedItem, previewLength: number): string | null {
  if (!item.summary) return null;
  const sentences = item.summary.replace(/([.!?])\s+/g, "$1|").split("|").filter(Boolean);
  if (previewLength === 0 || sentences.length <= previewLength) {
    return sentences.join(" ");
  }
  return sentences.slice(0, Math.max(1, previewLength)).join(" ") + " [...]";
}
