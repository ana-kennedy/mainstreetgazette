import { XMLParser } from "fast-xml-parser";
import type { FeedItem, RefreshResult, Source, SourceMeta } from "../domain/models";
import { groupFeedItems } from "../utils/grouping";
import { parseDuration, stableHash, stripHTML } from "../utils/formatting";
import { applyParkTags } from "../utils/parkTagger";

type RSSLink = {
  url?: string;
  rel?: string;
};

type RSSAuthor = {
  name?: string;
};

type RSSEnclosure = {
  url?: string;
  length?: string;
  mimeType?: string;
};

type RSSCategory = {
  name?: string;
};

type RSSItem = {
  id?: string;
  videoID?: string;
  title?: string;
  imageUrl?: string;
  links?: RSSLink[];
  description?: string;
  content?: string;
  categories?: RSSCategory[];
  authors?: RSSAuthor[];
  published?: string;
  enclosures?: RSSEnclosure[];
  itunes?: {
    authors?: RSSAuthor[];
    duration?: string;
    image?: string;
    subtitle?: string;
    summary?: string;
  };
};

type RSSFeed = {
  title?: string;
  image?: { url?: string };
  itunes?: {
    author?: RSSAuthor[];
    image?: string;
  };
  items: RSSItem[];
};

type XMLRecord = Record<string, unknown>;

// Represents a successfully fetched feed payload. etag/lastModified come from
// response headers and are absent when fetched via proxy (which strips them).
type FetchedFeed = {
  text: string;
  etag?: string;
  lastModified?: string;
};

const FEED_FETCH_TIMEOUT_MS = 8000;
const SOURCE_REFRESH_TIMEOUT_MS = 12000;
// After N consecutive failures, skip a source for progressively longer periods.
const BACKOFF_INTERVALS_MS = [2 * 60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000];
const MAX_ITEMS_PER_SOURCE: Record<Source["sourceType"], number> = {
  rssArticle: 50,
  youtubeChannel: 50,
  podcastRSS: 75,
  redditFeed: 10
};
const xmlParser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
  isArray: (_tagName, jPath) => ["rss.channel.item", "feed.entry"].includes(String(jPath))
});

function backoffMs(failureCount: number): number {
  return BACKOFF_INTERVALS_MS[Math.min(failureCount - 1, BACKOFF_INTERVALS_MS.length - 1)];
}

function httpsURLOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

function requireHTTPSURL(value: string): string {
  const httpsURL = httpsURLOrNull(value);
  if (!httpsURL) {
    throw new Error("Only HTTPS URLs are supported.");
  }
  return httpsURL;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMS: number, message: string, onTimeout?: () => void): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, timeoutMS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function firstLink(item: RSSItem): string | null {
  return item.links?.find((link) => link.rel === "alternate" && link.url)?.url ?? item.links?.find((link) => link.url)?.url ?? null;
}

function publishedDate(item: RSSItem): string {
  const parsed = item.published ? new Date(item.published) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date(0).toISOString();
}

function itemSummary(item: RSSItem): string | null {
  const raw = item.itunes?.summary ?? item.description ?? item.content ?? item.itunes?.subtitle;
  return raw ? stripHTML(raw) : null;
}

function authorOrSource(source: Source, item: RSSItem): string {
  return item.itunes?.authors?.[0]?.name ?? item.authors?.[0]?.name ?? source.name;
}

function channelArtwork(feed: RSSFeed): string | null {
  return feed.itunes?.image ?? feed.image?.url ?? null;
}

function itemArtwork(feed: RSSFeed, source: Source, item: RSSItem): string | null {
  return httpsURLOrNull(item.itunes?.image ?? item.imageUrl ?? channelArtwork(feed) ?? source.artworkURL);
}

function itemTags(item: RSSItem): string[] {
  return item.categories?.map((category) => category.name).filter((name): name is string => Boolean(name)) ?? [];
}

function recentItemsForSource(source: Source, items: RSSItem[]): RSSItem[] {
  const limit = MAX_ITEMS_PER_SOURCE[source.sourceType];
  if (source.sourceType === "redditFeed") {
    // Reddit's top.rss feed is already sorted by popularity — preserve that order
    return items.slice(0, limit);
  }
  return [...items]
    .sort((lhs, rhs) => new Date(publishedDate(rhs)).getTime() - new Date(publishedDate(lhs)).getTime())
    .slice(0, limit);
}

function asRecord(value: unknown): XMLRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as XMLRecord) : null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function textValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return textValue(value[0]);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const record = asRecord(value);
  const text = record?.["#text"];
  return typeof text === "string" ? text : undefined;
}

function attrValue(value: unknown, key: string): string | undefined {
  const attr = asRecord(value)?.[key];
  return typeof attr === "string" ? attr : undefined;
}

function parseCategories(value: unknown): RSSCategory[] {
  return asArray(value).map((category) => ({ name: textValue(category) })).filter((category) => Boolean(category.name));
}

function parseLinks(value: unknown): RSSLink[] {
  return asArray(value)
    .map((link) => {
      const href = attrValue(link, "href");
      const rel = attrValue(link, "rel");
      return { url: href ?? textValue(link), rel };
    })
    .filter((link) => Boolean(link.url));
}

function parseEnclosures(value: unknown): RSSEnclosure[] {
  return asArray(value)
    .map((enclosure) => ({
      url: attrValue(enclosure, "url"),
      length: attrValue(enclosure, "length"),
      mimeType: attrValue(enclosure, "type")
    }))
    .filter((enclosure) => Boolean(enclosure.url));
}

function parseAuthors(value: unknown): RSSAuthor[] {
  return asArray(value)
    .map((author) => ({ name: textValue(asRecord(author)?.name ?? author) }))
    .filter((author) => Boolean(author.name));
}

function parseRSSItem(raw: unknown): RSSItem {
  const item = asRecord(raw) ?? {};
  const mediaGroup = asRecord(item.group);
  const mediaThumbnail = asArray(mediaGroup?.thumbnail ?? item.thumbnail)[0];
  const guid = textValue(item.guid ?? item.id ?? item.videoId);
  const videoID = textValue(item.videoId);

  return {
    id: guid,
    videoID,
    title: textValue(item.title ?? mediaGroup?.title),
    imageUrl: attrValue(mediaThumbnail, "url") ?? textValue(item.image),
    links: parseLinks(item.link),
    description: textValue(item.description ?? mediaGroup?.description),
    content: textValue(item.encoded ?? item.content),
    categories: parseCategories(item.category),
    authors: parseAuthors(item.author ?? item.creator),
    published: textValue(item.pubDate ?? item.published ?? item.updated),
    enclosures: parseEnclosures(item.enclosure),
    itunes: {
      authors: parseAuthors(item.author),
      duration: textValue(item.duration),
      image: attrValue(item.image, "href") ?? textValue(item.image),
      subtitle: textValue(item.subtitle),
      summary: textValue(item.summary)
    }
  };
}

function parseFeed(text: string): RSSFeed {
  const parsed = xmlParser.parse(text) as XMLRecord;
  const rssChannel = asRecord(asRecord(parsed.rss)?.channel);
  const atomFeed = asRecord(parsed.feed);

  if (rssChannel) {
    return {
      title: textValue(rssChannel.title),
      image: { url: textValue(asRecord(rssChannel.image)?.url) },
      itunes: {
        author: parseAuthors(rssChannel.author),
        image: attrValue(rssChannel.image, "href")
      },
      items: asArray(rssChannel.item).map(parseRSSItem)
    };
  }

  if (atomFeed) {
    return {
      title: textValue(atomFeed.title),
      image: { url: attrValue(asArray(atomFeed.logo)[0], "url") ?? textValue(atomFeed.logo) },
      items: asArray(atomFeed.entry).map(parseRSSItem)
    };
  }

  return { items: [] };
}

// Used for the CORS proxy and YouTube HTML fallback — no conditional headers, plain text response.
async function fetchText(url: string): Promise<string> {
  const httpsURL = requireHTTPSURL(url);
  const controller = new AbortController();
  const request = (async () => {
    const response = await fetch(httpsURL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  })();

  try {
    return await withTimeout(request, FEED_FETCH_TIMEOUT_MS, "Feed request timed out", () => controller.abort());
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Feed request timed out");
    }
    throw error;
  }
}

// Direct fetch with conditional GET headers (ETag / If-Modified-Since).
// Returns null on 304 Not Modified — caller should use its cached items.
async function fetchDirect(source: Source, meta: SourceMeta): Promise<FetchedFeed | null> {
  const httpsURL = requireHTTPSURL(source.feedURL);
  const controller = new AbortController();
  const headers: Record<string, string> = {
    // A descriptive User-Agent prevents some servers from timing out on RSS clients.
    // Reddit specifically requires one to avoid 429/403; others (e.g. wdwinfo) fail fast
    // with 403 instead of stalling for the full timeout, giving the proxy fallback more time.
    "User-Agent": "MainStreetGazette/1.0 (Disney news reader; RSS client)"
  };
  if (meta.etag) headers["If-None-Match"] = meta.etag;
  if (meta.lastModified) headers["If-Modified-Since"] = meta.lastModified;

  const request = (async () => {
    const response = await fetch(httpsURL, { signal: controller.signal, headers });
    if (response.status === 304) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const etag = response.headers.get("etag") ?? undefined;
    const lastModified = response.headers.get("last-modified") ?? undefined;
    return { text, etag, lastModified };
  })();

  try {
    return await withTimeout(request, FEED_FETCH_TIMEOUT_MS, "Feed request timed out", () => controller.abort());
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Feed request timed out");
    }
    throw error;
  }
}

async function fetchFeedText(source: Source, meta: SourceMeta): Promise<FetchedFeed | null> {
  const proxiedURL = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(source.feedURL)}`;
  try {
    return await fetchDirect(source, meta);
  } catch {
    // Proxy fallback: no conditional headers, always returns full content.
    const text = await fetchText(proxiedURL);
    return { text };
  }
}

function normalizeArticle(source: Source, feed: RSSFeed, item: RSSItem): FeedItem | null {
  const link = httpsURLOrNull(firstLink(item));
  const title = item.title ? stripHTML(item.title) : "";
  if (!link || !title) return null;
  const summary = itemSummary(item);

  return {
    id: stableHash(`${source.id}|${link}`),
    sourceID: source.id,
    sourceType: source.sourceType,
    contentType: "article",
    title,
    subtitle: null,
    summary,
    canonicalURL: link,
    externalURL: link,
    publishedAt: publishedDate(item),
    authorOrChannel: authorOrSource(source, item),
    durationSeconds: null,
    artworkURL: httpsURLOrNull(channelArtwork(feed)),
    thumbnailURL: itemArtwork(feed, source, item),
    isSaved: false,
    isRead: false,
    isNewRelativeToCheckpoint: false,
    groupID: null,
    mediaPlaybackState: null,
    isDownloaded: false,
    downloadState: "notDownloaded",
    rawContentHash: stableHash(`${title}${summary ?? ""}`),
    trustLabel: source.trustLabel,
    tags: applyParkTags(`${title} ${summary ?? ""}`, itemTags(item)),
  };
}

function youTubeVideoID(item: RSSItem): string | null {
  const id = (item.videoID ?? item.id?.replace("yt:video:", ""))?.trim();
  if (id) return id;

  const link = firstLink(item);
  if (!link) return null;
  const match = /(?:[?&]v=|youtu\.be\/|embed\/)([^&?/]+)/.exec(link);
  return match?.[1] ?? null;
}

function decodeJSONText(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value.replace(/\\u0026/g, "&");
  }
}

function relativeYouTubeDate(value: string | null): string {
  if (!value) return new Date().toISOString();
  const match = /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i.exec(value);
  if (!match) return new Date().toISOString();

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const date = new Date();
  if (unit === "minute") date.setMinutes(date.getMinutes() - amount);
  if (unit === "hour") date.setHours(date.getHours() - amount);
  if (unit === "day") date.setDate(date.getDate() - amount);
  if (unit === "week") date.setDate(date.getDate() - amount * 7);
  if (unit === "month") date.setMonth(date.getMonth() - amount);
  if (unit === "year") date.setFullYear(date.getFullYear() - amount);
  return date.toISOString();
}

function fallbackYouTubeURL(source: Source): string | null {
  const homepage = httpsURLOrNull(source.homepageURL)?.replace(/\/$/, "");
  if (homepage) return `${homepage}/videos`;
  const channelID = /[?&]channel_id=([^&]+)/.exec(source.feedURL)?.[1];
  return channelID ? `https://www.youtube.com/channel/${channelID}/videos` : null;
}

function parseYouTubeHTMLFallback(source: Source, html: string): FeedItem[] {
  const items: FeedItem[] = [];
  const seen = new Set<string>();
  const rendererPattern = /"videoRenderer":\{([\s\S]*?)\},"trackingParams"/g;
  let match: RegExpExecArray | null;

  while ((match = rendererPattern.exec(html)) && items.length < MAX_ITEMS_PER_SOURCE.youtubeChannel) {
    const renderer = match[1];
    const videoID = /"videoId":"([^"]+)"/.exec(renderer)?.[1];
    const rawTitle = /"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/.exec(renderer)?.[1];
    if (!videoID || !rawTitle) continue;
    if (seen.has(videoID)) continue;
    seen.add(videoID);

    const title = stripHTML(decodeJSONText(rawTitle)).trim();
    if (!title || title === "Keyboard shortcuts" || title === "Playback") continue;

    const publishedText = /"publishedTimeText":\{"simpleText":"([^"]+)"/.exec(renderer)?.[1];
    const link = `https://www.youtube.com/watch?v=${videoID}`;
    const thumb = `https://i.ytimg.com/vi/${videoID}/hqdefault.jpg`;
    items.push({
      id: stableHash(`${source.id}|${videoID}`),
      sourceID: source.id,
      sourceType: source.sourceType,
      contentType: "video",
      title,
      subtitle: null,
      summary: null,
      canonicalURL: link,
      externalURL: link,
      publishedAt: relativeYouTubeDate(publishedText ? decodeJSONText(publishedText) : null),
      authorOrChannel: source.name,
      durationSeconds: null,
      artworkURL: thumb,
      thumbnailURL: thumb,
      isSaved: false,
      isRead: false,
      isNewRelativeToCheckpoint: false,
      groupID: null,
      mediaPlaybackState: null,
      isDownloaded: false,
      downloadState: "notDownloaded",
      rawContentHash: stableHash(`${title}${videoID}`),
      trustLabel: source.trustLabel,
      tags: applyParkTags(title, ["youtube"]),
    });
  }

  return items;
}

function normalizeYouTube(source: Source, item: RSSItem): FeedItem | null {
  const videoID = youTubeVideoID(item);
  const title = item.title ? stripHTML(item.title) : "";
  if (!videoID || !title) return null;
  const link = `https://www.youtube.com/watch?v=${videoID}`;
  const thumb = httpsURLOrNull(item.imageUrl) ?? `https://i.ytimg.com/vi/${videoID}/hqdefault.jpg`;
  const summary = itemSummary(item);

  return {
    id: stableHash(`${source.id}|${videoID}`),
    sourceID: source.id,
    sourceType: source.sourceType,
    contentType: "video",
    title,
    subtitle: null,
    summary,
    canonicalURL: link,
    externalURL: link,
    publishedAt: publishedDate(item),
    authorOrChannel: source.name,
    durationSeconds: null,
    artworkURL: thumb,
    thumbnailURL: thumb,
    isSaved: false,
    isRead: false,
    isNewRelativeToCheckpoint: false,
    groupID: null,
    mediaPlaybackState: null,
    isDownloaded: false,
    downloadState: "notDownloaded",
    rawContentHash: stableHash(`${title}${videoID}`),
    trustLabel: source.trustLabel,
    tags: applyParkTags(`${title} ${summary ?? ""}`, ["youtube"]),
  };
}

function normalizePodcast(source: Source, feed: RSSFeed, item: RSSItem): FeedItem | null {
  const enclosureURL = httpsURLOrNull(
    item.enclosures?.find((enclosure) => enclosure.url && (!enclosure.mimeType || enclosure.mimeType.startsWith("audio/")))?.url?.trim() ??
    item.enclosures?.find((enclosure) => enclosure.url)?.url?.trim() ??
    firstLink(item)
  );
  const title = item.title ? stripHTML(item.title) : "";
  if (!enclosureURL || !title) return null;
  const guid = item.id ?? enclosureURL;
  const artwork = itemArtwork(feed, source, item);
  const summary = itemSummary(item);

  return {
    id: stableHash(`${source.id}|${guid}`),
    sourceID: source.id,
    sourceType: source.sourceType,
    contentType: "podcast",
    title,
    subtitle: item.itunes?.subtitle ?? null,
    summary,
    canonicalURL: enclosureURL,
    externalURL: enclosureURL,
    publishedAt: publishedDate(item),
    authorOrChannel: authorOrSource(source, item),
    durationSeconds: parseDuration(item.itunes?.duration),
    artworkURL: artwork,
    thumbnailURL: artwork,
    isSaved: false,
    isRead: false,
    isNewRelativeToCheckpoint: false,
    groupID: null,
    mediaPlaybackState: null,
    isDownloaded: false,
    downloadState: "notDownloaded",
    rawContentHash: stableHash(`${title}${guid}`),
    trustLabel: source.trustLabel,
    tags: applyParkTags(`${title} ${summary ?? ""}`, ["podcast"]),
  };
}

function parseFeedItems(source: Source, feed: RSSFeed): FeedItem[] {
  const items = Array.isArray(feed.items) ? feed.items : [];
  return recentItemsForSource(source, items)
    .map((item) => {
      if (source.sourceType === "youtubeChannel") return normalizeYouTube(source, item);
      if (source.sourceType === "podcastRSS") return normalizePodcast(source, feed, item);
      return normalizeArticle(source, feed, item); // rssArticle and redditFeed both parse as articles
    })
    .filter((item): item is FeedItem => Boolean(item));
}

type FetchSourceResult = { items: FeedItem[]; updatedMeta: SourceMeta };

async function fetchSource(source: Source, meta: SourceMeta, previousItems: FeedItem[]): Promise<FetchSourceResult> {
  const cachedSourceItems = previousItems.filter((item) => item.sourceID === source.id);

  return withTimeout(
    (async () => {
      let fetchResult: FetchedFeed | null;

      try {
        fetchResult = await fetchFeedText(source, meta);
      } catch (error) {
        // YouTube RSS feeds sometimes block; fall back to scraping the channel page.
        if (source.sourceType !== "youtubeChannel") throw error;
        const fallbackURL = fallbackYouTubeURL(source);
        if (!fallbackURL) throw error;
        const html = await fetchText(fallbackURL);

        // Skip re-parsing if the HTML content hasn't changed.
        const newHash = stableHash(html);
        if (newHash === meta.rawHash && cachedSourceItems.length > 0) {
          return { items: cachedSourceItems, updatedMeta: { ...meta, failureCount: 0, nextRetryAt: undefined } };
        }

        const fallbackItems = parseYouTubeHTMLFallback(source, html);
        if (fallbackItems.length === 0) throw error;
        return {
          items: fallbackItems,
          updatedMeta: { ...meta, rawHash: newHash, failureCount: 0, nextRetryAt: undefined }
        };
      }

      // 304 Not Modified — server confirmed nothing changed.
      if (fetchResult === null) {
        return { items: cachedSourceItems, updatedMeta: meta };
      }

      const { text, etag, lastModified } = fetchResult;

      // Skip XML parsing when raw content is byte-for-byte identical to last fetch.
      const newHash = stableHash(text);
      if (newHash === meta.rawHash && cachedSourceItems.length > 0) {
        return {
          items: cachedSourceItems,
          updatedMeta: { ...meta, etag: etag ?? meta.etag, lastModified: lastModified ?? meta.lastModified }
        };
      }

      const feed = parseFeed(text);
      const items = parseFeedItems(source, feed);

      return {
        items,
        updatedMeta: {
          ...meta,
          etag: etag ?? meta.etag,
          lastModified: lastModified ?? meta.lastModified,
          rawHash: newHash,
          failureCount: 0,
          nextRetryAt: undefined
        }
      };
    })(),
    SOURCE_REFRESH_TIMEOUT_MS,
    `${source.name} refresh timed out`
  );
}

function dedupe(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  const result: FeedItem[] = [];
  for (const item of items) {
    const key = item.canonicalURL.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function normalizeSnapshot(rawItems: FeedItem[], savedIDs: string[], checkpointTime: number | null): FeedItem[] {
  return dedupe(rawItems)
    .map((item) => ({
      ...item,
      isSaved: savedIDs.includes(item.id),
      isNewRelativeToCheckpoint: checkpointTime !== null && new Date(item.publishedAt).getTime() > checkpointTime
    }))
    .sort((lhs, rhs) => new Date(rhs.publishedAt).getTime() - new Date(lhs.publishedAt).getTime());
}

export async function refreshFeeds(
  sources: Source[],
  savedIDs: string[],
  sourceMeta: Record<string, SourceMeta>,
  previousItems: FeedItem[],
  checkpointDate?: string | null,
  onProgress?: (partialItems: FeedItem[]) => void
): Promise<RefreshResult> {
  const enabledSources = sources.filter((source) => source.isEnabled);
  const failures: RefreshResult["failures"] = [];
  const rawItems: FeedItem[] = [];
  const checkpointTime = checkpointDate ? new Date(checkpointDate).getTime() : null;
  const updatedSourceMeta: Record<string, SourceMeta> = { ...sourceMeta };

  await Promise.all(
    enabledSources.map(async (source) => {
      const meta = sourceMeta[source.id] ?? {};

      // Exponential backoff: skip sources that failed recently and are within their retry window.
      if (meta.nextRetryAt && Date.now() < new Date(meta.nextRetryAt).getTime()) {
        const cached = previousItems.filter((item) => item.sourceID === source.id);
        rawItems.push(...cached);
        return;
      }

      try {
        const { items, updatedMeta } = await fetchSource(source, meta, previousItems);
        rawItems.push(...items);
        updatedSourceMeta[source.id] = updatedMeta;
        onProgress?.(normalizeSnapshot(rawItems, savedIDs, checkpointTime));
      } catch (e) {
        failures.push({ sourceID: source.id, message: e instanceof Error ? e.message : "Refresh failed" });
        const failureCount = (meta.failureCount ?? 0) + 1;
        updatedSourceMeta[source.id] = {
          ...meta,
          failureCount,
          nextRetryAt: new Date(Date.now() + backoffMs(failureCount)).toISOString()
        };
      }
    })
  );

  const normalized = normalizeSnapshot(rawItems, savedIDs, checkpointTime);
  const grouped = groupFeedItems(normalized);

  return {
    items: grouped.items,
    groups: grouped.groups,
    fetchedSourceCount: enabledSources.length - failures.length,
    fetchedItemCount: rawItems.length,
    failures,
    updatedSourceMeta
  };
}
