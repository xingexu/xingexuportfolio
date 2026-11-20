import { LINKS } from "@/app/data";
import type { BallKind } from "./volleyball";

export type JourneyLink = { href: string; label: string };
export type Rot = 0 | 1 | 2 | 3;
/** A model placed in a room. `x`/`z` is the footprint centre; rot turns the model's +z front by quarter turns. */
export type Placement = { model: string; x: number; z: number; y?: number; rot?: Rot; solid?: boolean; bump?: "tip" | "roll"; ball?: BallKind };
export type JourneyItem = Placement & {
  id: string;
  label: string;
  title: string;
  description?: string;
  links?: JourneyLink[];
  video?: { src: string; label: string; captions?: string; poster: string };
};
export type Outfit = "kid" | "starwars" | "stussy" | "western" | "csa";
export type Floor = "tarmac" | "wood" | "tile" | "carpet" | "gym" | "laminate" | "auditorium";
export type Roommate = { id: string; x: number; z: number; seatFacing: Rot; fridge: string; fridgeVia: readonly Vec2[]; pad: string; via: readonly [Vec2, Vec2, Vec2, Vec2] };
export const WESTERN_LIGHT_SWITCH_ID = "dorm-light-switch";
const WESTERN_ENTRY_X = 36;
const RICHARD_BED_X = WESTERN_ENTRY_X - 36;
const RICHARD_SEAT = { x: RICHARD_BED_X - 6, z: 46 };
const MY_BED = { x: 24, z: -47 };
const WESTERN_FRIDGE = { x: 58.25, z: -57, rot: 0 } as const;
const RICHARD_NIGHTSTAND = { x: -16, z: 37, rot: 1 } as const;
const WESTERN_SHOE_RACK = { x: WESTERN_ENTRY_X - 14, z: 58, rot: 2 } as const;
type Vec2 = { x: number; z: number };
export type Chapter = {
  id: string;
  number: string;
  place: string;
  location: string;
  heading: string;
  intro: string;
  ageFrom: number;
  ageTo: number;
  outfit: Outfit;
  outfitLabel: string;
  width: number;
  depth: number;
  floor: Floor;
  wall: number;
  trim: number;
  background: number;
  outdoor?: boolean;
  entryX?: number;
  doorLabel: string;
  /** Typed on the minimal transition screen. */
  stop: string;
  stopNote?: string;
  items: JourneyItem[];
  decor: Placement[];
  roommate?: Roommate;
};

const gh = (repo: string, label = `View ${repo} on GitHub`): JourneyLink => ({ href: `${LINKS.github}/${repo}`, label });
const LINKEDIN: JourneyLink = { href: LINKS.linkedin, label: "See it on LinkedIn" };

function expandRoom(chapter: Chapter): Chapter {
  const spread = <T extends Placement>(p: T): T => ({
    ...p,
    x: p.x + (Math.abs(p.x) >= 20 ? Math.sign(p.x) * 10 : 0),
    z: p.z + (Math.abs(p.z) >= 20 ? Math.sign(p.z) * 10 : 0),
  });
  return { ...chapter, width: chapter.width + 20, depth: chapter.depth + 20, items: chapter.items.map(spread), decor: chapter.decor.map(spread) };
}

const ROOMS: Chapter[] = [
  {
    id: "arrival", stop: "Canada", number: "01", place: "Arriving in Canada", location: "Canada", heading: "Seven years old. A new country.",
    intro: "Arrival in Canada at age seven.",
    ageFrom: 7, ageTo: 7, outfit: "kid", outfitLabel: "Propeller cap · rainbow lollipop · shorts",
    width: 120, depth: 96, floor: "tarmac", wall: 0xd8dde3, trim: 0x2f5f8a, background: 0x8ec9ef, outdoor: true, doorLabel: "ARRIVALS",
    items: [
      { id: "plane", model: "plane", x: -31, z: 2, label: "Plane", title: "Arrival in Canada", description: "I moved to Canada at seven." },
      { id: "airstairs", model: "airstairs", x: -16, z: -12, label: "Airstairs", title: "Airstairs" },
      { id: "suitcases", model: "luggage-cart", x: 18, z: 8, rot: 3, label: "Suitcases", title: "Suitcases", description: "Next stop: 18 Holsworthy Crescent." },
      { id: "welcome", model: "welcome-sign", x: 30, z: -10, rot: 3, label: "Welcome to Canada sign", title: "Welcome to Canada" },
    ],
    decor: [
      { model: "cone", x: 10, z: 26, bump: "tip" }, { model: "cone", x: 12, z: -26, bump: "tip" }, { model: "cone", x: -10, z: -28, bump: "tip" },
      { model: "runway-light", x: 40, z: 30 }, { model: "runway-light", x: 40, z: 10 }, { model: "runway-light", x: 40, z: -10 },
      { model: "runway-light", x: -44, z: 34 }, { model: "bench", x: 20, z: -34, solid: true },
      { model: "service-cart", x: 49, z: 22, rot: 3 },
    ],
  },
  {
    id: "holsworthy", stop: "18 Holsworthy", stopNote: "my first home in Canada", number: "02", place: "18 Holsworthy Crescent", location: "Markham, Ontario", heading: "My first home.",
    intro: "My first home in Canada. This is the room where chess, badminton and computer games all started.",
    ageFrom: 7, ageTo: 9, outfit: "kid", outfitLabel: "Propeller cap · rainbow lollipop · shorts",
    width: 64, depth: 72, floor: "wood", wall: 0xa9c7d6, trim: 0xf1ead8, background: 0xa6c6d5, doorLabel: "SCHOOL",
    items: [
      { id: "chess", model: "chess-table", x: -14, z: -16, label: "Chessboard", title: "Chessboard",
        description: "I started playing chess at 18 Holsworthy.",
        links: [{ href: LINKS.lichess, label: "Play me on Lichess" }] },
      { id: "agario", model: "computer-desk-agario", x: 22, z: -14, rot: 3, label: "Computer · Agar.io", title: "Agar.io",
        description: "My favorite computer game as a kid.",
        links: [{ href: "https://agar.io", label: "Play Agar.io" }] },
      { id: "badminton", model: "badminton-rack", x: 29, z: 14, y: 9, rot: 3, solid: false, label: "Badminton rackets", title: "Badminton rackets",
        description: "I played competitive badminton at KC Badminton from grade 2 up until grade 6.",
        links: [{ href: "https://www.badminton.ca", label: "Badminton Canada" }] },
      { id: "kid-bed", model: "bed-kid", x: -22, z: 20, label: "Bed", title: "My bed at Holsworthy" },
      { id: "lego", model: "lego-shelf", x: -27, z: -6, rot: 1, label: "LEGO shelf", title: "LEGO shelf",
        description: "I kept my LEGO Star Wars builds here." },
      { id: "window", model: "window", x: -29, z: -25, y: 12, rot: 1, solid: false, label: "Window", title: "Bedroom window" },
      { id: "posters", model: "starwars-posters", x: -18, z: -33, y: 11, solid: false, label: "Star Wars posters", title: "Star Wars posters",
        description: "These hung above my chessboard." },
      { id: "candy", model: "candy-jar", x: 24, z: 2, label: "Candy jar", title: "Candy jar",
        description: "I kept it beside the computer." },
    ],
    decor: [{ model: "rug-round", x: 0, z: 2, solid: false }, { model: "toy-box", x: 24, z: 26 }, { model: "dresser", x: -25, z: -25, rot: 1 }],
  },
  {
    id: "school", stop: "Primary school", number: "03", place: "Grade 5", location: "Elementary school", heading: "Getting into code.",
    intro: "Grade 5: a perfect score on the Beaver Computing Challenge, Scratch, Python and Raspberry Pis.",
    ageFrom: 10, ageTo: 11, outfit: "starwars", outfitLabel: "Star Wars hoodie · pants · Nike Air Max",
    width: 64, depth: 72, floor: "tile", wall: 0xe6dcc2, trim: 0x5d8a6b, background: 0xa6c6d5, doorLabel: "ELM AVE",
    items: [
      { id: "beaver", model: "plaque-cemc-gold", x: 18, z: -33, y: 14, solid: false, label: "Beaver Computing Challenge certificate", title: "Beaver Computing Challenge",
        description: "I got a perfect score in grade 5.",
        links: [{ href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2019/2019BCCResults.pdf", label: "2019 Beaver Computing Challenge results" }] },
      { id: "raspberry-pi", model: "pi-bench", x: 22, z: -8, rot: 3, label: "Raspberry Pis · ECG monitor", title: "Raspberry Pi ECG monitor",
        description: "My first hardware project was an ECG monitor.",
        links: [gh("ecgmonitor", "View the ECG monitor on GitHub")] },
      { id: "scratch", model: "computer-desk-scratch", x: 23, z: 16, rot: 3, label: "Classroom computer · Scratch", title: "Scratch and Python",
        description: "I made games and calculators in Scratch before learning Python.",
        links: [gh("ScratchFiles", "My Scratch projects"), gh("PythonFiles", "My first Python files")] },
      { id: "chalkboard", model: "chalkboard", x: -19, z: -33, y: 9, solid: false, label: "Chalkboard", title: "Grade 5 chalkboard" },
      { id: "desks", model: "school-desks", x: -18, z: 0, label: "Classroom desks", title: "Classroom desks" },
    ],
    decor: [{ model: "bookshelf-class", x: -27, z: 24, rot: 1 }, { model: "clock", x: -24, z: -33, y: 28, solid: false }, { model: "globe-stand", x: -26, z: -20 }, { model: "classroom-cubbies", x: 27, z: -27 }],
  },
  {
    id: "elm", stop: "Middle school", number: "04", place: "10 Elm Avenue", location: "10 Elm Avenue", heading: "A new house. A new instrument.",
    intro: "We moved into 10 Elm Avenue. I picked up piano and started writing math contests.",
    ageFrom: 11, ageTo: 13, outfit: "starwars", outfitLabel: "Star Wars hoodie · pants · Nike Air Max",
    width: 64, depth: 72, floor: "carpet", wall: 0xb7c4a5, trim: 0xf3efe2, background: 0xa6c6d5, doorLabel: "BAYVIEW",
    items: [
      { id: "piano", model: "grand-piano", x: -17, z: -15, label: "Yamaha grand piano", title: "Yamaha grand piano",
        description: "I started playing piano after we moved to Elm Avenue.",
        links: [{ href: "https://ca.yamaha.com/en/musical-instruments/pianos/products/grand-pianos/", label: "Yamaha grand pianos" }] },
      { id: "amc8", model: "plaque-maa", x: 29, z: 2, y: 15, rot: 3, solid: false, label: "AMC 8 certificate", title: "AMC 8 certificate",
        description: "The AMC 8 was my first math contest.",
        links: [{ href: "https://maa.org/student-programs/amc/", label: "About the AMC" }] },
      { id: "elm-desk", model: "computer-desk-code", x: 22, z: -14, rot: 3, label: "Desk & PC", title: "Desk & PC",
        description: "I did homework and wrote code here." },
      { id: "elm-bed", model: "bed-navy", x: 22, z: 21, label: "Bed", title: "My bed at Elm Avenue" },
      { id: "elm-bookshelf", model: "bookshelf-math", x: -27, z: 27, rot: 1, label: "Bookshelf", title: "Bookshelf",
        description: "Math contest books and a LEGO Star Wars build." },
      { id: "elm-poster", model: "poster-starwars-big", x: -29, z: 9, y: 12, rot: 1, solid: false, label: "Star Wars poster", title: "Star Wars poster" },
    ],
    decor: [{ model: "rug-square", x: 0, z: 6, solid: false }, { model: "basketball", x: 8, z: 24, bump: "roll" }, { model: "beanbag", x: -14, z: 28 }, { model: "dresser", x: -26, z: 14, rot: 1 }],
  },
  {
    id: "bayview", stop: "Secondary school", number: "05", place: "Bayview Secondary School", location: "Richmond Hill, Ontario", heading: "High school.",
    intro: "Volleyball, competitive programming, the AIME, Brawl Stars, my own projects, and FBLC, from member to president.",
    ageFrom: 14, ageTo: 17, outfit: "stussy", outfitLabel: "Black Stüssy hoodie · grey sweatpants · Yeezy Slides",
    width: 72, depth: 76, floor: "gym", wall: 0xc8ccd2, trim: 0x23477a, background: 0xa6c6d5, doorLabel: "WESTERN",
    items: [
      { id: "volleyball", model: "volleyball", x: -17, z: 17, ball: "mikasa", label: "Mikasa volleyball", title: "Mikasa volleyball",
        description: "I started playing in high school. Press R or tap Spike near the ball.",
        links: [{ href: LINKS.volleyball, label: "Follow @ziggyvb" }] },
      { id: "laptop", model: "macbook", x: 25, z: 6, y: 12, rot: 3, solid: false, label: "Laptop · competitive programming", title: "Competitive programming",
        description: "I practiced for the Canadian Computing Competition and solved LeetCode problems.",
        links: [gh("leetcode", "My LeetCode solutions"), gh("CCC", "My CCC practice")] },
      { id: "aime", model: "plaque-aime", x: 35, z: -28, y: 13, rot: 3, solid: false, label: "AIME qualifier · 2024 & 2025", title: "American Invitational Mathematics Examination",
        description: "I qualified for the AIME in 2024 and 2025.",
        links: [{ href: "https://maa.org/student-programs/amc/", label: "About the AIME" }] },
      { id: "maa", model: "plaque-maa", x: 35, z: -15, y: 13, rot: 3, solid: false, label: "MAA · American Mathematics Competitions", title: "American Mathematics Competitions",
        description: "I started with the AMC 8 and later qualified for the AIME.",
        links: [{ href: "https://maa.org/student-programs/amc/", label: "Visit the MAA contest program" }] },
      { id: "jane-street", model: "jane-street-tees", x: -35, z: -1, y: 12, rot: 1, solid: false, label: "Jane Street T-shirts", title: "Jane Street T-shirts",
        description: "Shirts from my 2024 and 2025 AIME qualifications.",
        links: [{ href: "https://www.janestreet.com", label: "Jane Street" }] },
      { id: "waterloo", model: "plaque-cemc", x: -35, z: -26, y: 12, rot: 1, solid: false, label: "CEMC · Waterloo math contests", title: "Waterloo math contests",
        description: "I wrote the Fryer, Galois and Hypatia contests in high school.",
        links: [
          { href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2022/2022FGHResults.pdf", label: "2022 FGH results" },
          { href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2023/2023FGHResults.pdf", label: "2023 FGH results" },
          { href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2025/2025FGHResults.pdf", label: "2025 FGH results" },
        ] },
      { id: "brawlstars", model: "brawl-stand", x: 24, z: -12, label: "Brawl Stars", title: "Brawl Stars",
        description: "I played a lot in high school. That’s El Primo beside the display.",
        links: [{ href: "https://supercell.com/en/games/brawlstars/", label: "Brawl Stars" }] },
      { id: "projects", model: "projects-board", x: 35, z: 4, y: 19, rot: 3, solid: false, label: "Projects board", title: "Projects board",
        description: "I started building my own projects in high school.",
        links: [{ href: "/projects", label: "Explore my projects" }, { href: LINKS.github, label: "My GitHub" }] },
      { id: "fblc", model: "fblc-banner", x: -35, z: 26, y: 14, rot: 1, solid: false, label: "FBLC banner", title: "FBLC",
        description: "I became president of Bayview’s FBLC chapter.",
        links: [{ href: "https://fblc.ca", label: "Future Business Leaders of Canada" }] },
      { id: "award-2024", model: "glass-trophy-third", x: -21, z: -31, y: 9, solid: false, label: "Coding & Programming · 3rd place, 2024", title: "Coding & Programming, 2024",
        description: "Third place at FBLA.",
        links: [LINKEDIN, gh("FBLA", "My 2023–24 FBLA project")] },
      { id: "award-2025", model: "glass-trophy-first", x: 21, z: -31, y: 9, solid: false, label: "Coding & Programming · 1st place, 2025", title: "Coding & Programming, 2025",
        description: "First place at FBLA.",
        links: [LINKEDIN] },
    ],
    decor: [
      { model: "volleyball-net", x: -19, z: 6 }, { model: "lockers", x: 31, z: 26, rot: 3 }, { model: "ball-cart", x: 15, z: 30 },
      ...([12, 18].flatMap(x => [28, 32].map(z => ({ model: "volleyball", x, z, y: 10, ball: "mikasa" as const })))),
      { model: "coding-desk", x: 24, z: 6, rot: 3 },
      { model: "bench", x: -24, z: 34, rot: 2 },
      { model: "trophy-plinth", x: -21, z: -31 }, { model: "trophy-plinth", x: 21, z: -31 },
    ],
  },
  {
    id: "western", stop: "University", number: "06", place: "Ontario Hall", location: "Western University · London, Ontario", heading: "Where I am now.",
    intro: "My first-year double room at Western.",
    ageFrom: 18, ageTo: 18, outfit: "western", outfitLabel: "Regular-fit black hoodie & sweatpants · black UGGs",
    width: 132, depth: 128, floor: "carpet", wall: 0xefeee8, trim: 0xb8b1a3, background: 0x575653, doorLabel: "NEXT", entryX: WESTERN_ENTRY_X,
    items: [
      { id: WESTERN_LIGHT_SWITCH_ID, model: "dorm-light-switch", x: WESTERN_ENTRY_X - 9, z: 61, y: 14, rot: 2, solid: false,
        label: "Lamp switch", title: "Dorm lamp switch", description: "Switches both desk lamps without changing the room lighting." },
      { id: "degree", model: "cs-ivey", x: -10, z: 61, y: 20, rot: 2, solid: false, label: "CS + Ivey", title: "Computer Science + Ivey",
        description: "I study Computer Science at Western and have Ivey AEO status.",
        links: [{ href: "https://www.csd.uwo.ca", label: "Western Computer Science" }, { href: "https://www.ivey.uwo.ca/hba/", label: "Ivey HBA" }] },
      { id: "mustangs", model: "go-mustangs", x: -20, z: 61, y: 14, rot: 2, solid: false, label: "Go Mustangs poster", title: "Go Mustangs",
        links: [{ href: "https://westernmustangs.ca/", label: "Western Mustangs" }] },
      { id: "csa", model: "poster-csa", x: -63, z: -20, y: 14, rot: 1, solid: false, label: "CSA poster", title: "Chinese Students’ Association",
        description: "I’m a Productions Executive at CSA.",
        video: { src: "/videos/journey/csa.mp4", label: "CSA at Western", captions: "/videos/journey/csa.en.vtt", poster: "/videos/journey/csa.webp" },
        links: [{ href: "https://csawestern.com/links", label: "CSA Western" }, { href: "https://www.instagram.com/csawestern/", label: "@csawestern" }] },
      { id: "wds", model: "poster-wds", x: -63, z: -3, y: 14, rot: 1, solid: false, label: "Western Developers Society poster", title: "Western Developers Society",
        description: "I’m the Director of Internals.",
        links: [{ href: "https://www.westerndevsociety.ca/", label: "Western Developers Society" }, { href: "https://linktr.ee/westerndevsociety", label: "WDS Linktree" }] },
      { id: "wfn", model: "poster-wfn", x: -63, z: 14, y: 14, rot: 1, solid: false, label: "Western Founders Network poster", title: "Western Founders Network",
        description: "I’m a director on the Projects team.",
        links: [{ href: "https://linktr.ee/westernfoundersnetwork", label: "Western Founders Network" }, { href: "https://www.instagram.com/westernfoundersnetwork/", label: "@westernfoundersnetwork" }] },
      { id: "ohall-bed", model: "bed-western", ...MY_BED, label: "Blue and beige bed", title: "My bed in Ontario Hall" },
      { id: "richards-bed", model: "bed-roommate", x: RICHARD_BED_X, z: 53, rot: 1, label: "Richard’s bed", title: "Richard’s bed" },
      { id: "richard", model: "roommate-portrait", ...RICHARD_SEAT, solid: false, label: "Richard Su", title: "Richard Su",
        description: "My roommate in Ontario Hall.",
        video: { src: "/videos/journey/richard.mp4", label: "Richard’s dorm routine: walking, getting milk, and practicing hockey (silent)", poster: "/videos/journey/richard.webp" },
        links: [{ href: "https://www.linkedin.com/in/richard-su-7377542b9/", label: "Richard’s LinkedIn" }] },
      { id: "hockey-pad", model: "hockey-pad", x: -43, z: 5, solid: false, label: "Hockey practice pad", title: "Synthetic ice pad",
        description: "Richard uses it to practice stickhandling." },
      { id: "jellycat", model: "jellycat-frog", x: MY_BED.x + 4, z: MY_BED.z + 11, y: 7, solid: false, label: "Ricky the Rainfrog", title: "Ricky the Rainfrog",
        description: "My Jellycat frog." },
      { id: "standing-desk", model: "standing-desk", x: 55, z: -14, rot: 3, label: "My standing desk", title: "My standing desk",
        description: "I use it for coding and club work." },
      { id: "richards-desk", model: "standing-desk-roommate", x: -38, z: -38, rot: 1, label: "Richard’s standing desk", title: "Richard’s standing desk" },
      { id: "richards-nightstand", model: "dorm-nightstand", ...RICHARD_NIGHTSTAND, label: "Richard’s nightstand", title: "Richard’s nightstand" },
      { id: "ohall-nightstand", model: "dorm-nightstand", x: 44, z: -58, label: "My nightstand", title: "My nightstand" },
      { id: "desk-charging-ports", model: "dorm-charging-ports", x: 63.25, z: -39, y: 9, rot: 3, solid: false,
        label: "Desk charging ports", title: "Desk charging ports", description: "A wall outlet with USB-A and USB-C ports." },
      { id: "bedside-charging-ports", model: "dorm-charging-ports", x: 12, z: -61.25, y: 8, solid: false,
        label: "My bedside charging ports", title: "My bedside charging ports", description: "A wall outlet with USB-A and USB-C ports." },
      { id: "richards-charging-ports", model: "dorm-charging-ports", x: -25, z: 61.25, y: 8, rot: 2, solid: false,
        label: "Richard’s charging ports", title: "Richard’s charging ports", description: "A wall outlet with USB-A and USB-C ports." },
      { id: "monitor", model: "monitor", x: 56, z: -14, y: 18, rot: 3, solid: false, label: "Monitor", title: "Monitor",
        links: [{ href: LINKS.github, label: "See what I’m building" }] },
      { id: "desk-lamp", model: "desk-lamp", x: 57, z: -27, y: 18, rot: 3, solid: false, label: "Desk lamp", title: "Desk lamp" },
      { id: "dorm-headphones", model: "dorm-headphones", x: 56, z: -2.5, y: 18, rot: 3, solid: false, label: "My headphones", title: "My headphones" },
      { id: "smiskis", model: "smiskis", x: 52, z: -23, y: 18, rot: 3, solid: false, label: "My Smiskis", title: "My Smiskis" },
      { id: "buldak", model: "buldak-bowl", x: 52, z: 1, y: 18, rot: 3, solid: false, label: "Buldak noodles", title: "Buldak at 5 a.m.",
        video: { src: "/videos/journey/buldak.mp4", label: "Buldak at 5 a.m. (silent)", poster: "/videos/journey/buldak.webp" } },
      { id: "mini-fridge", model: "mini-fridge", ...WESTERN_FRIDGE, label: "Mini fridge", title: "Mini fridge",
        description: "Snacks and drinks." },
      { id: "fragrances", model: "fragrances", ...WESTERN_FRIDGE, y: 13, solid: false, label: "Fragrances", title: "Fragrances",
        description: "I keep these on the mini fridge." },
      { id: "fan", model: "fan", x: 55, z: 10.5, y: 12, rot: 3, solid: false, label: "Wuzu fan", title: "Wuzu fan",
        description: "An oscillating fan that blows a breeze across the dorm." },
      { id: "dorm-snacks", model: "dorm-snacks", x: 50, z: 8, y: 12, rot: 3, solid: false, label: "Dorm snacks", title: "Dorm snacks",
        description: "Chips, cookies, Pocky, and a cup of instant noodles." },
      { id: "closet", model: "closet", x: 55, z: 38, rot: 3, label: "Double closet", title: "Wooden double closet",
        description: "Hoodies, sweatpants, and snacks are put away inside." },
      { id: "shoe-rack", model: "dorm-shoe-rack", ...WESTERN_SHOE_RACK, label: "Shoe rack", title: "Entry shoe rack" },
      { id: "pink-shoes", model: "pink-court-shoes", ...WESTERN_SHOE_RACK, z: WESTERN_SHOE_RACK.z - 0.5, y: 8, solid: false, label: "Pink volleyball shoes", title: "Pink volleyball shoes" },
      { id: "molten", model: "molten-volleyball", x: -24, z: 14, ball: "molten", label: "Molten volleyball", title: "Molten volleyball",
        description: "Press R or tap Set near the ball." },
      { id: "laundry", model: "laundry-basket", x: -56, z: 17, rot: 1, label: "Laundry basket", title: "Laundry basket" },
    ],
    decor: [
      { model: "desk-divider", x: 9, z: -35, rot: 1 },
      { model: "monitor", x: -39, z: -38, y: 18, rot: 1, solid: false },
      { model: "desk-lamp", x: -40, z: -26, y: 18, rot: 1, solid: false },
      { model: "dorm-chair", x: 45, z: -26, rot: 3 }, { model: "dorm-chair", x: -27, z: -32, rot: 1 },
      { model: "dorm-cabinet", x: 55, z: 9, rot: 3 },
      { model: "dorm-snacks", x: 59, z: -21, y: 32, rot: 3, solid: false },
      { model: "dorm-snacks", ...RICHARD_NIGHTSTAND, y: 10, solid: false },
    ],
    roommate: { id: "richard", ...RICHARD_SEAT, seatFacing: 2, fridge: "mini-fridge", pad: "hockey-pad",
      fridgeVia: [{ x: 38, z: 29 }, { x: 38, z: -41 }, { x: WESTERN_FRIDGE.x - 2, z: -41 }],
      via: [{ x: RICHARD_SEAT.x, z: 38 }, { x: RICHARD_SEAT.x, z: 29 }, { x: -22, z: 21 }, { x: -43, z: 19 }] },
  },
];

export const CHAPTERS = ROOMS.map(chapter => chapter.outdoor || chapter.id === "western" ? chapter : expandRoom(chapter));
export const WESTERN_INDEX = CHAPTERS.findIndex(chapter => chapter.id === "western");
export const JOURNEY_START_INDEX = WESTERN_INDEX;
export const CSA_POSTER_ID = "csa";
export const CSA_ROOM_INDEX = CHAPTERS.length;
export const CSA_STAGE_Z = -62;
export const CSA_BARBER_CHAIR = { x: -65, z: -10 } as const;
export const CSA_BARBER_SEAT = 10;
export const CSA_DJ_LINK: JourneyLink = { href: "https://wewantdrought.me", label: "Rain Li’s website" };
export const JOURNEY_ROOMS: readonly Chapter[] = [...CHAPTERS, {
  id: "csa-after-hours", stop: "CSA After Hours", number: "", place: "CSA After Hours", location: "Western University",
  heading: "CSA After Hours", intro: "An auditorium hidden behind the CSA poster.", stopNote: "Behind the poster · Western University",
  ageFrom: 18, ageTo: 18, outfit: "csa", outfitLabel: "Black CSA tee · black pants",
  width: 190, depth: 176, floor: "auditorium", wall: 0x302739, trim: 0x65424b, background: 0x171221,
  doorLabel: "DORM", items: [],
  decor: [
    { model: "csa-dj-booth", x: 0, z: CSA_STAGE_Z },
    { model: "csa-dj-macbook", x: 12, z: CSA_STAGE_Z - 0.75, y: 13, rot: 2, solid: false },
    { model: "csa-speaker", x: -41, z: CSA_STAGE_Z - 3 },
    { model: "csa-speaker", x: -28, z: CSA_STAGE_Z - 3 },
    { model: "csa-speaker", x: 28, z: CSA_STAGE_Z - 3 },
    { model: "csa-speaker", x: 41, z: CSA_STAGE_Z - 3 },
    { model: "csa-stage-logo", x: 0, z: CSA_STAGE_Z - 16, y: 20, solid: false },
    ...[40, 55, 70].flatMap(z => [-32, 32].map(x => ({ model: "csa-seat-row", x, z, rot: 2 as const }))),
    { model: "csa-barber-chair", ...CSA_BARBER_CHAIR, rot: 1 },
    { model: "csa-barber-mirror", x: -66, z: CSA_BARBER_CHAIR.z - 11 },
    { model: "csa-boba-cup", x: 19, z: 32, rot: 1, solid: false },
    { model: "csa-water-bottle", x: -45, z: 34, solid: false },
    { model: "csa-soda-cup", x: 52, z: 47, solid: false },
    { model: "csa-boba-cup", x: -18, z: 49, solid: false },
    { model: "csa-soda-cup", x: -63, z: 25, rot: 3, solid: false },
    { model: "csa-water-bottle", x: 28, z: 61, solid: false },
    { model: "csa-boba-cup", x: 66, z: -22, rot: 2, solid: false },
    { model: "csa-soda-cup", x: -72, z: -21, solid: false },
    { model: "csa-boba-cup", x: -13, z: CSA_STAGE_Z + 2, y: 13, solid: false },
  ],
}];
const CHAPTER_ACCENTS = [0x89cced, 0xffcf79, 0x80ddc5, 0xfaac96, 0x91b8f3, 0xc4a2ff];
export const chapterAccent = (index: number) => index === CSA_ROOM_INDEX ? 0xff8d6b : CHAPTER_ACCENTS[index] ?? CHAPTER_ACCENTS[0];
export const ALL_ITEMS = CHAPTERS.flatMap((chapter, index) => chapter.items.map(item => ({ ...item, chapter: index })));
export const itemById = (id: string) => ALL_ITEMS.find(item => item.id === id);
export const ageLabel = (chapter: Chapter) => chapter.ageFrom === chapter.ageTo ? `${chapter.ageFrom}` : `${chapter.ageFrom}–${chapter.ageTo}`;
