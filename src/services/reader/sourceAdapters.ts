export interface SourceAdapter {
  id: string;
  version: number;
  hostnames: string[];
  minimumWordCount?: number;
  supportsLiveUpdates?: boolean;
  removePatterns: RegExp[];
}

const commonBoilerplate = [
  /sign up for (our|the) newsletter/i,
  /subscribe (to|for) (our|the)/i,
  /follow (us|.+) on (facebook|instagram|x|twitter|youtube|tiktok)/i,
  /click here to (subscribe|learn more|read more)/i,
  /related (posts|articles|stories)/i,
  /you may also like/i,
  /leave a comment/i,
  /advertisement/i,
];

export const SOURCE_ADAPTERS: SourceAdapter[] = [
  {
    id: "disneyParksBlog",
    version: 1,
    hostnames: ["disneyparksblog.com", "www.disneyparksblog.com"],
    minimumWordCount: 120,
    removePatterns: [...commonBoilerplate, /more from disney parks blog/i],
  },
  {
    id: "disneyFoodBlog",
    version: 1,
    hostnames: ["disneyfoodblog.com", "www.disneyfoodblog.com"],
    minimumWordCount: 120,
    removePatterns: [...commonBoilerplate, /dfb guide/i, /affiliate/i, /amazon associate/i],
  },
  {
    id: "wdwNewsToday",
    version: 1,
    hostnames: ["wdwnt.com", "www.wdwnt.com"],
    minimumWordCount: 120,
    supportsLiveUpdates: true,
    removePatterns: [...commonBoilerplate, /daily recap/i, /wdw news today/i],
  },
  {
    id: "insideTheMagic",
    version: 1,
    hostnames: ["insidethemagic.net", "www.insidethemagic.net"],
    minimumWordCount: 140,
    removePatterns: [...commonBoilerplate, /recommended/i, /image credit/i],
  },
  {
    id: "wdwInfo",
    version: 1,
    hostnames: ["wdwinfo.com", "www.wdwinfo.com"],
    minimumWordCount: 120,
    removePatterns: [...commonBoilerplate, /disboards/i, /planning navigation/i],
  },
  {
    id: "chipAndCompany",
    version: 1,
    hostnames: ["chipandco.com", "www.chipandco.com"],
    minimumWordCount: 140,
    removePatterns: [...commonBoilerplate, /travel agency/i, /discount/i, /promo code/i],
  },
  {
    id: "disneyTouristBlog",
    version: 1,
    hostnames: ["disneytouristblog.com", "www.disneytouristblog.com"],
    minimumWordCount: 140,
    removePatterns: [...commonBoilerplate, /affiliate/i],
  },
  {
    id: "blogMickey",
    version: 1,
    hostnames: ["blogmickey.com", "www.blogmickey.com"],
    minimumWordCount: 120,
    removePatterns: [...commonBoilerplate, /in this article/i],
  },
  {
    id: "touringPlans",
    version: 1,
    hostnames: ["touringplans.com", "www.touringplans.com"],
    minimumWordCount: 120,
    removePatterns: [...commonBoilerplate, /subscriber/i],
  },
  {
    id: "kennyThePirate",
    version: 1,
    hostnames: ["kennythepirate.com", "www.kennythepirate.com"],
    minimumWordCount: 140,
    removePatterns: [...commonBoilerplate, /membership/i],
  },
  {
    id: "attractionsMagazine",
    version: 1,
    hostnames: ["attractionsmagazine.com", "www.attractionsmagazine.com"],
    minimumWordCount: 120,
    removePatterns: [...commonBoilerplate, /magazine subscription/i],
  },
  {
    id: "laughingPlace",
    version: 1,
    hostnames: ["laughingplace.com", "www.laughingplace.com"],
    minimumWordCount: 120,
    supportsLiveUpdates: true,
    removePatterns: [...commonBoilerplate, /photo gallery/i],
  },
  {
    id: "dlpReport",
    version: 1,
    hostnames: ["dlpreport.com", "www.dlpreport.com"],
    minimumWordCount: 60,
    removePatterns: commonBoilerplate,
  },
  {
    id: "dlpWelcome",
    version: 1,
    hostnames: ["dlpwelcome.com", "www.dlpwelcome.com"],
    minimumWordCount: 80,
    removePatterns: commonBoilerplate,
  },
  {
    id: "tdrExplorer",
    version: 1,
    hostnames: ["tdrexplorer.com", "www.tdrexplorer.com"],
    minimumWordCount: 120,
    removePatterns: [...commonBoilerplate, /booking/i, /affiliate/i],
  },
];

export function findSourceAdapter(url: string): SourceAdapter | undefined {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SOURCE_ADAPTERS.find((adapter) =>
      adapter.hostnames.some((candidate) => hostname === candidate)
    );
  } catch {
    return undefined;
  }
}

export function cleanAdapterText(text: string, adapter?: SourceAdapter): string | null {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  const patterns = adapter?.removePatterns ?? commonBoilerplate;
  return patterns.some((pattern) => pattern.test(trimmed)) ? null : trimmed;
}
