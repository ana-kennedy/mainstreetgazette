export type ParkTagKey =
  | "magic_kingdom"
  | "epcot"
  | "hollywood_studios"
  | "animal_kingdom"
  | "disneyland"
  | "california_adventure"
  | "disneyland_paris"
  | "walt_disney_studios_paris"
  | "tokyo_disneyland"
  | "tokyo_disneysea"
  | "shanghai_disneyland"
  | "hong_kong_disneyland";

const PARK_KEYWORDS: Record<ParkTagKey, string[]> = {
  magic_kingdom: [
    "magic kingdom", "cinderella castle", "cinderella's castle",
    "space mountain", "haunted mansion", "big thunder mountain",
    "tomorrowland", "fantasyland", "liberty square", "frontierland",
    "adventureland", "main street u.s.a", "seven dwarfs mine train",
    "tron lightcycle run", "jungle cruise", "pirates of the caribbean",
    "splash mountain", "tiana's bayou", "dumbo", "peter pan",
  ],
  epcot: [
    "epcot", "world showcase", "future world", "flower and garden",
    "food and wine", "festival of the arts", "guardians of the galaxy",
    "frozen ever after", "remy's ratatouille", "test track",
    "spaceship earth", "world discovery", "world nature",
    "world celebration", "journey of water", "creations shop",
    "harmonious", "luminous",
  ],
  hollywood_studios: [
    "hollywood studios", "galaxy's edge", "star wars",
    "rise of the resistance", "millennium falcon", "tower of terror",
    "rock 'n' roller coaster", "rock n roller coaster",
    "slinky dog dash", "toy story land", "muppets",
    "indiana jones stunt", "fantasmic", "runaway railway",
    "alien swirling", "star tours",
  ],
  animal_kingdom: [
    "animal kingdom", "pandora", "avatar", "kilimanjaro safaris",
    "expedition everest", "flight of passage", "navi river",
    "rafiki's planet watch", "kali river rapids", "dinosaur ride",
    "wildlife express", "festival of the lion king",
    "rivers of light", "tree of life",
  ],
  disneyland: [
    "disneyland park", "disneyland resort", "anaheim",
    "matterhorn bobsleds", "indiana jones adventure",
    "buzz lightyear astro blasters", "pirates of the caribbean",
    "haunted mansion", "star wars: galaxy's edge",
    "it's a small world", "big thunder mountain railroad",
    "space mountain", "fantasy faire", "toontown",
  ],
  california_adventure: [
    "california adventure", "cars land", "radiator springs racers",
    "pixar pier", "guardians of the galaxy mission breakout",
    "web slingers", "avengers campus", "inside out emotional whirlwind",
    "silly symphony swings", "grizzly peak", "buena vista street",
    "incredicoaster", "world of color",
  ],
  disneyland_paris: [
    "disneyland paris", "dlp", "parc disneyland paris",
    "sleeping beauty castle paris", "phantom manor",
    "big thunder mountain paris", "star wars hyperspace mountain",
    "buzz lightyear laser blast",
  ],
  walt_disney_studios_paris: [
    "walt disney studios park", "studio 1 paris",
    "avengers assemble electric siege", "cars road trip",
    "worlds of pixar", "la place de rémy", "ratatouille paris",
    "tower of terror paris", "crush's coaster",
  ],
  tokyo_disneyland: [
    "tokyo disneyland", "tdl",
    "monsters inc ride and go seek", "beauty and the beast castle",
    "haunted mansion", "star wars hyperspace mountain",
    "pooh's hunny hunt", "big thunder mountain tokyo",
    "space mountain tokyo",
  ],
  tokyo_disneysea: [
    "tokyo disneysea", "disneysea", "disney sea", "tds",
    "fantasy springs", "soaring", "journey to the center of the earth",
    "20000 leagues under the sea", "indiana jones adventure crystal skull",
    "tower of terror disneysea", "aquatopia",
  ],
  shanghai_disneyland: [
    "shanghai disneyland", "shanghai disney", "shdl",
    "adventure isle", "tron lightcycle power run",
    "zootopia", "roaring rapids", "camp discovery",
    "voyager of the crystal grotto",
  ],
  hong_kong_disneyland: [
    "hong kong disneyland", "hkdl", "world of frozen",
    "ant-man and the wasp", "iron man experience",
    "mystic manor", "big grizzly mountain", "RC racer",
  ],
};

export function applyParkTags(text: string, existingTags: string[]): string[] {
  const lower = text.toLowerCase();
  const parkTags: string[] = [];
  for (const [key, keywords] of Object.entries(PARK_KEYWORDS) as [ParkTagKey, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      parkTags.push(`park:${key}`);
    }
  }
  return [...new Set([...existingTags, ...parkTags])];
}
