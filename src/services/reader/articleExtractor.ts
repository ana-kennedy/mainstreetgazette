import type { ReaderBlock, ReaderDocument } from "../../types/readerTypes";
import { cleanAdapterText, findSourceAdapter } from "./sourceAdapters";
import { qualityForBlocks } from "./readerQuality";

export interface ArticleExtractor {
  extract(input: {
    itemId: string;
    sourceId: string;
    title: string;
    publishedAt?: string | null;
    author?: string | null;
    feedSummary?: string | null;
    originalUrl: string;
    finalUrl: string;
    html: string;
    adapterId?: string;
  }): Promise<ReaderDocument>;
}

const EXTRACTION_VERSION = 1;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function metaContent(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1] ? decodeEntities(match[1].trim()) : undefined;
}

function contentHash(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function isolateArticleHtml(html: string): string {
  const candidates = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<div\b[^>]*(?:class|id)=["'][^"']*(?:entry-content|post-content|article-content|story-content|content-area)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of candidates) {
    const match = html.match(pattern);
    if (match?.[1] && stripTags(match[1]).split(/\s+/).length > 80) {
      return match[1];
    }
  }
  return html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
}

function normalizeHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form\b[\s\S]*?<\/form>/gi, "")
    .replace(/<(nav|footer|aside)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function splitBlocks(html: string, finalUrl: string): ReaderBlock[] {
  const blocks: ReaderBlock[] = [];
  const blockPattern = /<(h[2-4]|p|li|blockquote|figcaption)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let currentList: string[] = [];
  let match: RegExpExecArray | null;
  const adapter = findSourceAdapter(finalUrl);

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: "unorderedList", items: currentList });
      currentList = [];
    }
  };

  while ((match = blockPattern.exec(html))) {
    const tag = match[1].toLowerCase();
    const text = cleanAdapterText(stripTags(match[2]), adapter);
    if (!text || text.length < 2) continue;

    if (tag === "li") {
      currentList.push(text);
      continue;
    }

    flushList();
    if (tag.startsWith("h")) {
      blocks.push({ type: "heading", level: Number(tag.slice(1)) as 2 | 3 | 4, text });
    } else if (tag === "blockquote") {
      blocks.push({ type: "blockquote", text });
    } else if (tag === "figcaption") {
      blocks.push({ type: "imageCaption", text });
    } else {
      blocks.push({ type: "paragraph", text });
    }
  }
  flushList();

  const unique: ReaderBlock[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const key = "text" in block ? block.text.toLowerCase() : "items" in block ? block.items.join("|").toLowerCase() : JSON.stringify(block);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(block);
  }
  return unique.slice(0, 160);
}

export class GenericArticleExtractor implements ArticleExtractor {
  async extract(input: Parameters<ArticleExtractor["extract"]>[0]): Promise<ReaderDocument> {
    const adapter = findSourceAdapter(input.finalUrl);
    const normalized = normalizeHtml(isolateArticleHtml(input.html));
    const blocks = splitBlocks(normalized, input.finalUrl);
    const plainText = stripTags(input.html);
    const quality = qualityForBlocks({
      blocks,
      htmlText: plainText,
      feedSummary: input.feedSummary,
      minimumWordCount: adapter?.minimumWordCount ?? 120,
    });

    const canonicalUrl =
      metaContent(input.html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) ??
      metaContent(input.html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["'][^>]*>/i) ??
      input.finalUrl;
    const title =
      metaContent(input.html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ??
      input.title;
    const author =
      metaContent(input.html, /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["'][^>]*>/i) ??
      input.author ??
      undefined;
    const publishedAt =
      metaContent(input.html, /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i) ??
      input.publishedAt ??
      undefined;
    const updatedAt = metaContent(input.html, /<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["'][^>]*>/i);

    return {
      itemId: input.itemId,
      sourceId: input.sourceId,
      originalUrl: input.originalUrl,
      canonicalUrl,
      title,
      author,
      publishedAt,
      updatedAt,
      fetchedAt: new Date().toISOString(),
      readingTimeMinutes: Math.max(1, Math.ceil(quality.wordCount / 225)),
      wordCount: quality.wordCount,
      blocks,
      adapterId: adapter?.id ?? input.adapterId ?? "generic",
      adapterVersion: adapter?.version ?? 1,
      extractionVersion: EXTRACTION_VERSION,
      contentHash: contentHash(blocks.map((block) => ("text" in block ? block.text : JSON.stringify(block))).join("\n")),
      qualityScore: quality.restricted ? 0 : quality.score,
      qualityReasons: quality.reasons,
    };
  }
}
