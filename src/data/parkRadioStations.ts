export interface ParkRadioStation {
  id: string;
  name: string;
  description: string;
  officialListenURL: string;
  officialAppStoreURL?: string;
  availabilityNote?: string;
}

export const PARK_RADIO_STATIONS: ParkRadioStation[] = [
  {
    id: "sorcerer-radio",
    name: "Sorcerer Radio",
    description:
      "Disney-themed channels featuring park audio, background loops, ride audio, seasonal selections, and relaxing music.",
    officialListenURL: "https://srsounds.com/wp/listen/",
    officialAppStoreURL: "https://apps.apple.com/us/app/sorcerer-radio/id443848537",
  },
  {
    id: "dpark-radio",
    name: "DParkRadio",
    description:
      "Independent theme-park radio with main, background, holiday or Main Street, and resort television channels.",
    officialListenURL: "https://dparkradio.com/music/",
    officialAppStoreURL: "https://apps.apple.com/us/app/dparkradio-com/id942568948",
  },
  {
    id: "mouseworld-radio",
    name: "MouseWorld Radio",
    description: "A long-running independent Disney parks radio service.",
    officialListenURL: "https://www.mouseworldradio.com/",
    availabilityNote: "Station availability and player behavior may change.",
  },
  {
    id: "park-world-radio",
    name: "Park World Radio",
    description: "Independent music inspired by Disney parks around the world.",
    officialListenURL: "https://live365.com/station/Park-World-Radio-a89698",
  },
];
