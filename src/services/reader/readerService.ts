import type { ReaderDocument, ReaderRecord } from "../../types/readerTypes";
import { DirectArticleTransport, type PublicHtmlResponse } from "./articleTransport";
import { GenericArticleExtractor, type ArticleExtractor } from "./articleExtractor";
import { AsyncStorageReaderCache } from "./readerCache";
import { findSourceAdapter } from "./sourceAdapters";

export interface ArticleTransport {
  fetchPublicHtml(url: string, signal?: AbortSignal): Promise<PublicHtmlResponse>;
}

export interface ReaderCache {
  get(itemId: string): Promise<ReaderDocument | undefined>;
  put(document: ReaderDocument): Promise<void>;
}

export class ReaderService {
  constructor(
    private readonly transport: ArticleTransport,
    private readonly extractor: ArticleExtractor,
    private readonly cache: ReaderCache
  ) {}

  async openArticle(input: {
    itemId: string;
    sourceId: string;
    title: string;
    publishedAt?: string | null;
    author?: string | null;
    url: string;
    feedSummary: string;
    forceRefresh?: boolean;
    signal?: AbortSignal;
  }): Promise<ReaderRecord> {
    if (!input.forceRefresh) {
      const cached = await this.cache.get(input.itemId);
      if (cached) {
        return { status: "available", feedSummary: input.feedSummary, document: cached };
      }
    }

    try {
      const response = await this.transport.fetchPublicHtml(input.url, input.signal);
      if (!response.contentType.toLowerCase().includes("text/html")) {
        return { status: "previewOnly", feedSummary: input.feedSummary, failureReason: "unsupported" };
      }

      const adapter = findSourceAdapter(response.finalUrl);
      const document = await this.extractor.extract({
        itemId: input.itemId,
        sourceId: input.sourceId,
        title: input.title,
        publishedAt: input.publishedAt,
        author: input.author,
        feedSummary: input.feedSummary,
        originalUrl: input.url,
        finalUrl: response.finalUrl,
        html: response.html,
        adapterId: adapter?.id,
      });

      if (document.qualityScore < 0.65 || document.blocks.length === 0) {
        return { status: "previewOnly", feedSummary: input.feedSummary, failureReason: "lowQuality" };
      }

      await this.cache.put(document);
      return { status: "available", feedSummary: input.feedSummary, document };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const restricted =
        message.includes("captcha") ||
        message.includes("paywall") ||
        message.includes("forbidden") ||
        message.includes("unauthorized") ||
        message.includes("restricted");

      return {
        status: restricted ? "restricted" : "failed",
        feedSummary: input.feedSummary,
        failureReason: restricted ? "restricted" : "network",
      };
    }
  }
}

export const readerService = new ReaderService(
  new DirectArticleTransport(),
  new GenericArticleExtractor(),
  new AsyncStorageReaderCache()
);
