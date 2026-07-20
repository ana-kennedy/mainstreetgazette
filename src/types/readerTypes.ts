export type ReaderStatus =
  | "idle"
  | "loading"
  | "available"
  | "previewOnly"
  | "restricted"
  | "failed"
  | "stale";

export type ReaderFailureReason = "network" | "restricted" | "notArticle" | "lowQuality" | "unsupported";

export type ReaderBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "unorderedList"; items: string[] }
  | { type: "orderedList"; items: string[] }
  | { type: "blockquote"; text: string; citation?: string }
  | { type: "table"; caption?: string; headers: string[]; rows: string[][] }
  | { type: "imageCaption"; text: string; sourceUrl?: string }
  | { type: "linkCard"; title: string; url: string; description?: string }
  | { type: "separator" };

export interface ReaderDocument {
  itemId: string;
  sourceId: string;
  originalUrl: string;
  canonicalUrl: string;
  title: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  fetchedAt: string;
  readingTimeMinutes: number;
  wordCount: number;
  blocks: ReaderBlock[];
  adapterId: string;
  adapterVersion: number;
  extractionVersion: number;
  contentHash: string;
  qualityScore: number;
  qualityReasons: string[];
}

export interface ReaderRecord {
  status: ReaderStatus;
  feedSummary: string;
  document?: ReaderDocument;
  failureReason?: ReaderFailureReason;
}
