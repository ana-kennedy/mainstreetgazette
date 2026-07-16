import catalogData from "../assets/data/sourceCatalogV1.json";
import type { OfficialStatus, Source, SourceCatalog, SourceCategory, SourceRecord, TrustLabel } from "../domain/models";

// Working feed URLs that override catalog URLs:
// - YouTube: catalog has handle URLs (@Name); we need channel-ID RSS feed URLs
// - Podcasts: catalog may have placeholder URLs; use known-working feeds
// - Reddit: use weekly-top variant for better curation
const FEED_URL_OVERRIDES: Record<string, string> = {
  disney_food_blog_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCnpWedLQdHpZqhgTLdB9Yyg",
  allears_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCfzP_CiebRdveD9rRZv5Ndw",
  the_tim_tracker_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCd18OhMfRmjMjzSHP7Zrzmw",
  wdwnt_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCRIVd5Ci1bTQqJB_T4q_Jgg",
  mammoth_club_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCpSgg_ECBj25s9moCDfSTsA",
  paging_mr_morrow_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCscn2aSpMrS2U_mf7OF-UwQ",
  super_enthused_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCLuKPtTOtrPVaBuZBuDYbaw",
  ordinary_adventures_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZrh7jGCGMnxu5GZ_EuJaMw",
  // Catalog had raw @handle URLs (HTML pages, not feeds) for these — confirmed via the
  // channel pages' canonical/og:url metadata, cross-checked against the page title.
  the_dis_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UC7SjQGMropNWcVKwtwVQkbg",
  chip_and_company_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCyT62Hyk23gfAjfg0avezAQ",
  attractions_magazine_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFpI4b_m-449cePVasc2_8g",
  resorttv1_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCAjpFyA7FCRoGOuj5i4kq9g",
  // @DISUnplugged handle no longer exists (404) — the show rebranded its YouTube presence
  // to "DIS Unlimited" (confirmed via the channel's own description referencing the podcast).
  dis_unplugged_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbFqSGIcm2bI71hM7M1Om5Q",
  // Official Disney channels — same wrong-URL-format bug (raw @handle/legacy /user/ page
  // instead of a real feed), confirmed via canonical/og:url + title on each channel page.
  disney_parks_blog_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UC1xwwLwm6WSMbUn_Tp597hQ",
  walt_disney_imagineering_youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UC4DavIB24rEr5waVY5AgZLg",
  // disneyparksblog.com/disney-eats/feed/ 404s — the site restructured this section under /section/.
  disney_eats_rss: "https://disneyparksblog.com/section/disney-eats/feed/",
  wdw_radio_podcast: "https://feeds.captivate.fm/wdwradio/",
  dis_unplugged_podcast: "https://rss.libsyn.com/shows/37406/destinations/100330.xml",
  // wdwinfo.com/podcast/feed/ now 403s/410s regardless of User-Agent — the DIS's podcast
  // moved to Acast under the "DIS Unlimited" rebrand (confirmed via Apple Podcasts directory).
  the_dis_podcast: "https://feeds.acast.com/public/shows/64b9c1d15aa4ce0011519cee",
  be_our_guest_podcast_podcast: "https://beourguestpodcast.com/feed/podcast/",
  window_to_the_magic_podcast: "https://feeds.libsyn.com/18340/rss",
  unlocking_the_magic_podcast: "https://feeds.libsyn.com/66005/rss",
  disney_dish_jim_hill_podcast: "https://feeds.megaphone.fm/JHM6229164720",
  main_street_magic_podcast_podcast: "https://feeds.simplecast.com/ZY83mmKf",
  // wdwnt.com/category/podcasts/feed/ 404s — podcast content moved to its own subdomain.
  wdwnt_podcast: "https://podcasts.wdwnt.com/feed/",
  reddit_waltdisneyworld_rss: "https://www.reddit.com/r/waltdisneyworld/top.rss?t=week",
  reddit_disneyland_rss: "https://www.reddit.com/r/disneyland/top.rss?t=week",
  reddit_disneyparks_rss: "https://www.reddit.com/r/disneyparks/top.rss?t=week",
  reddit_disneycruise_rss: "https://www.reddit.com/r/DisneyCruise/top.rss?t=week",
  reddit_disneyvacationclub_rss: "https://www.reddit.com/r/DisneyVacationClub/top.rss?t=week",
  reddit_disneyfood_rss: "https://www.reddit.com/r/DisneyFood/top.rss?t=week",
};

// Old kebab-case IDs from sources.json, mapped to new catalog-derived IDs.
// Lets storage merge preserve user-configured isEnabled state across the upgrade.
const LEGACY_SOURCE_IDS: Record<string, string> = {
  disney_parks_blog_rss: "disney-parks-blog",
  disney_food_blog_rss: "disney-food-blog",
  wdwnt_rss: "wdw-news-today",
  inside_the_magic_rss: "inside-the-magic",
  the_dis_rss: "the-dis",
  chip_and_company_rss: "chip-and-company",
  disney_tourist_blog_rss: "disney-tourist-blog",
  blogmickey_rss: "blog-mickey",
  touringplans_rss: "touringplans-blog",
  kenny_the_pirate_rss: "kenny-the-pirate",
  attractions_magazine_rss: "attractions-magazine",
  laughing_place_rss: "laughing-place",
  allears_rss: "allears",
  mickeyblog_rss: "mickeyblog",
  disney_food_blog_youtube: "dfbguide-youtube",
  allears_youtube: "allears-youtube",
  the_tim_tracker_youtube: "tim-tracker-youtube",
  wdwnt_youtube: "wdwnt-youtube",
  mammoth_club_youtube: "mammoth-club-youtube",
  paging_mr_morrow_youtube: "paging-mr-morrow-youtube",
  super_enthused_youtube: "super-enthused-youtube",
  ordinary_adventures_youtube: "ordinary-adventures-youtube",
  wdw_radio_podcast: "wdw-radio",
  dis_unplugged_podcast: "dis-unplugged",
  be_our_guest_podcast_podcast: "be-our-guest-podcast",
  window_to_the_magic_podcast: "window-to-the-magic",
  unlocking_the_magic_podcast: "unlocking-the-magic",
  disney_dish_jim_hill_podcast: "disney-dish",
  rope_drop_radio_podcast: "rope-drop-radio",
  reddit_waltdisneyworld_rss: "reddit-waltdisneyworld",
  reddit_disneyland_rss: "reddit-disneyland",
  reddit_disneyparks_rss: "reddit-disneyparks",
};

// Sources from the old sources.json that have no equivalent in the new catalog.
// Preserved here so existing users don't lose them on upgrade.
const ORPHANED_LEGACY_SOURCES: Source[] = [
  {
    id: "dlp-report",
    name: "DLP Report",
    sourceType: "rssArticle",
    feedURL: "https://dlpreport.com/feed/",
    homepageURL: "https://dlpreport.com/",
    trustLabel: "communitySource",
    categoryTags: ["parksNews", "community", "international"],
    isEnabled: false,
    isDefaultEnabled: false,
    isCustom: false,
    isRecommended: false,
    description: "Dedicated Disneyland Paris news, updates, and event coverage.",
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: "News Site",
    officialStatus: "Unofficial",
    coverageAreas: ["Disneyland Paris"],
  },
  {
    id: "dlp-welcome",
    name: "DLPWelcome",
    sourceType: "rssArticle",
    feedURL: "https://www.dlpwelcome.com/feed/",
    homepageURL: "https://www.dlpwelcome.com/",
    trustLabel: "communitySource",
    categoryTags: ["parksNews", "community", "international"],
    isEnabled: false,
    isDefaultEnabled: false,
    isCustom: false,
    isRecommended: false,
    description: "Disney parks news covering Disneyland Paris and global parks.",
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: "News Site",
    officialStatus: "Unofficial",
    coverageAreas: ["Disneyland Paris"],
  },
  {
    id: "tdr-explorer",
    name: "TDR Explorer",
    sourceType: "rssArticle",
    feedURL: "https://tdrexplorer.com/feed/",
    homepageURL: "https://tdrexplorer.com/",
    trustLabel: "communitySource",
    categoryTags: ["parksNews", "community", "international"],
    isEnabled: false,
    isDefaultEnabled: false,
    isCustom: false,
    isRecommended: false,
    description: "English-language news for Tokyo Disneyland and Tokyo DisneySea.",
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: "News Site",
    officialStatus: "Unofficial",
    coverageAreas: ["Tokyo Disney Resort"],
  },
  {
    id: "theme-park-shuffle",
    name: "Theme Park Shuffle",
    sourceType: "podcastRSS",
    feedURL: "https://feeds.simplecast.com/NbPREI42",
    homepageURL: null,
    trustLabel: "communitySource",
    categoryTags: ["podcast", "community"],
    isEnabled: false,
    isDefaultEnabled: false,
    isCustom: false,
    isRecommended: false,
    description: "Theme park news and discussion podcast.",
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: "Podcast",
    officialStatus: "Unofficial",
    coverageAreas: ["Disney Parks General"],
  },
  {
    id: "resortloop",
    name: "ResortLoop Podcast",
    sourceType: "podcastRSS",
    feedURL: "https://resortloop.com/feed/podcast/",
    homepageURL: "https://resortloop.com/",
    trustLabel: "communitySource",
    categoryTags: ["podcast", "planning", "community"],
    isEnabled: false,
    isDefaultEnabled: false,
    isCustom: false,
    isRecommended: false,
    description: "Walt Disney World news and resort discussion podcast.",
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: "Podcast",
    officialStatus: "Unofficial",
    coverageAreas: ["Walt Disney World"],
  },
  {
    id: "reddit-disneylandparis",
    name: "r/DisneylandParis",
    sourceType: "redditFeed",
    feedURL: "https://www.reddit.com/r/disneylandparis/top.rss?t=week",
    homepageURL: "https://www.reddit.com/r/disneylandparis/",
    trustLabel: "communitySource",
    categoryTags: ["social", "parksNews", "international"],
    isEnabled: false,
    isDefaultEnabled: false,
    isCustom: false,
    isRecommended: false,
    description: "Top posts this week from the Disneyland Paris subreddit.",
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: "Reddit Community",
    officialStatus: "Community",
    coverageAreas: ["Disneyland Paris"],
  },
  {
    id: "reddit-disney",
    name: "r/disney",
    sourceType: "redditFeed",
    feedURL: "https://www.reddit.com/r/disney/top.rss?t=week",
    homepageURL: "https://www.reddit.com/r/disney/",
    trustLabel: "communitySource",
    categoryTags: ["social"],
    isEnabled: false,
    isDefaultEnabled: false,
    isCustom: false,
    isRecommended: false,
    description: "Top posts this week from the Disney subreddit.",
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: "Reddit Community",
    officialStatus: "Community",
    coverageAreas: ["Disney Parks General"],
  },
];

function trustLabelFromPriority(priority: number, status: OfficialStatus): TrustLabel {
  if (status === "Official" && priority >= 85) return "official";
  if (priority >= 75) return "verifiedNews";
  return "communitySource";
}

function categoryTagsFromRecord(record: SourceRecord): SourceCategory[] {
  const tags = new Set<SourceCategory>();
  if (record.officialStatus === "Official") tags.add("official");
  if (record.primaryContentType === "video") tags.add("video");
  else if (record.primaryContentType === "podcast") tags.add("podcast");
  else if (record.primaryContentType === "community") tags.add("social");
  const cats = record.contentCategories.map((c) => c.toLowerCase());
  if (cats.some((c) => ["dining", "food"].includes(c))) tags.add("food");
  if (cats.some((c) => ["planning", "trip reports", "trip planning"].includes(c))) tags.add("planning");
  if (cats.some((c) => ["hotels", "resorts"].includes(c))) tags.add("hotels");
  if (cats.some((c) => ["attractions"].includes(c))) tags.add("attractions");
  const internationalAreas = ["Disneyland Paris", "Tokyo Disney Resort", "Hong Kong Disneyland", "Shanghai Disney Resort"];
  if (record.coverageAreas.some((a) => internationalAreas.includes(a))) tags.add("international");
  if (!tags.has("video") && !tags.has("podcast") && !tags.has("social")) tags.add("parksNews");
  return [...tags];
}

function recordPlatformToSource(record: SourceRecord, platform: string): Source | null {
  const catalogURL = record.platforms[platform as keyof typeof record.platforms];
  const overrideKey = `${record.sourceId}_${platform}`;
  const feedURL = FEED_URL_OVERRIDES[overrideKey] ?? catalogURL;

  // Skip entries with no usable feed URL (e.g., individual reporters with no RSS)
  if (!feedURL) return null;

  // Skip forum/social platforms — no fetchable feed yet
  if (["forum", "x", "bluesky", "facebook", "instagram", "threads", "tiktok"].includes(platform)) return null;

  const isReddit = feedURL.includes("reddit.com");
  const sourceType: Source["sourceType"] =
    platform === "youtube" ? "youtubeChannel"
    : platform === "podcast" ? "podcastRSS"
    : isReddit ? "redditFeed"
    : "rssArticle";

  const id = overrideKey;
  const legacyId = LEGACY_SOURCE_IDS[id];
  const officialStatus = record.officialStatus as OfficialStatus;

  return {
    id,
    legacyId,
    sourceRecordId: record.sourceId,
    name: record.displayName,
    sourceType,
    feedURL,
    homepageURL: record.websiteUrl ?? null,
    trustLabel: trustLabelFromPriority(record.trustPriority, officialStatus),
    categoryTags: categoryTagsFromRecord(record),
    isEnabled: record.defaultEnabled,
    isDefaultEnabled: record.defaultEnabled,
    isCustom: false,
    isRecommended: record.trustPriority >= 85 && record.defaultEnabled,
    description: record.notes ?? null,
    artworkURL: null,
    lastRefreshAt: null,
    lastRefreshSucceeded: null,
    lastErrorMessage: null,
    publisherType: record.publisherType,
    officialStatus,
    coverageAreas: record.coverageAreas,
    trustPriority: record.trustPriority,
  };
}

export function getSourceCatalog(): SourceCatalog {
  return catalogData as SourceCatalog;
}

export function getAllSourceRecords(): SourceRecord[] {
  return getSourceCatalog().sources;
}

export function getSourceRecord(sourceRecordId: string): SourceRecord | undefined {
  return getSourceCatalog().sources.find((r) => r.sourceId === sourceRecordId);
}

export function getSourceRecordsByPublisherType(publisherType: string): SourceRecord[] {
  return getSourceCatalog().sources.filter((r) => r.publisherType === publisherType);
}

export function loadBundledSources(): Source[] {
  const sources: Source[] = [];
  const seenIds = new Set<string>();

  for (const record of getSourceCatalog().sources) {
    for (const platform of record.includedPlatforms) {
      const source = recordPlatformToSource(record, platform);
      if (source && !seenIds.has(source.id)) {
        seenIds.add(source.id);
        sources.push(source);
      }
    }
  }

  // Add legacy sources not covered by the catalog
  for (const legacy of ORPHANED_LEGACY_SOURCES) {
    if (!seenIds.has(legacy.id)) {
      seenIds.add(legacy.id);
      sources.push(legacy);
    }
  }

  return sources;
}
