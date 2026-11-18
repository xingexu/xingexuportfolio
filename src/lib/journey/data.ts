import { LINKS } from "@/app/data";

export type JourneyLink = { href: string; label: string };
export type Rot = 0 | 1 | 2 | 3;
/** A model placed in a room. `x`/`z` is the footprint centre; rot turns the model's +z front by quarter turns. */
export type Placement = { model: string; x: number; z: number; y?: number; rot?: Rot; solid?: boolean };
export type JourneyItem = Placement & {
  id: string;
  label: string;
  title: string;
  description: string;
  links?: JourneyLink[];
  video?: { src: string; label: string; captions: string; poster: string };
};
export type Outfit = "kid" | "starwars" | "essentials" | "western";
export type Floor = "tarmac" | "wood" | "tile" | "carpet" | "gym" | "laminate";
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
  doorLabel: string;
  /** Typed on the minimal transition screen. */
  stop: string;
  stopNote?: string;
  items: JourneyItem[];
  decor: Placement[];
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
    intro: "Step off the plane and walk forward into the arrivals hall. Everything you can see glows when you get close; press E or tap it to look closer.",
    ageFrom: 7, ageTo: 7, outfit: "kid", outfitLabel: "Propeller cap · rainbow lollipop · shorts",
    width: 120, depth: 96, floor: "tarmac", wall: 0xd8dde3, trim: 0x2f5f8a, background: 0x8ec9ef, outdoor: true, doorLabel: "ARRIVALS",
    items: [
      { id: "plane", model: "plane", x: -31, z: 2, label: "Plane", title: "Seven years old. A new country.",
        description: "I came to Canada when I was seven. This is where the walk begins: stepping off the plane in my propeller cap, lollipop in hand, with the rest of my life still ahead of me." },
      { id: "airstairs", model: "airstairs", x: -16, z: -12, label: "Airstairs", title: "First steps.",
        description: "The first steps I took in Canada were down these stairs, one at a time." },
      { id: "suitcases", model: "luggage-cart", x: 18, z: 8, rot: 3, label: "Suitcases", title: "Packed for a new country.",
        description: "A cart of suitcases packed for a brand-new country, headed for our first home at 18 Holsworthy Crescent." },
      { id: "welcome", model: "welcome-sign", x: 30, z: -10, rot: 3, label: "Welcome to Canada sign", title: "Welcome to Canada.",
        description: "A new country, a new language, and a lot of firsts waiting just past the arrivals doors." },
    ],
    decor: [
      { model: "cone", x: 10, z: 26 }, { model: "cone", x: 12, z: -26 }, { model: "cone", x: -10, z: -28 },
      { model: "runway-light", x: 40, z: 30 }, { model: "runway-light", x: 40, z: 10 }, { model: "runway-light", x: 40, z: -10 },
      { model: "runway-light", x: -44, z: 34 }, { model: "bench", x: 20, z: -34, solid: true },
      { model: "service-cart", x: 49, z: 22, rot: 3 },
    ],
  },
  {
    id: "holsworthy", stop: "18 Holsworthy", stopNote: "my first home in Canada", number: "02", place: "18 Holsworthy Crescent", location: "Markham, Ontario", heading: "My first home.",
    intro: "My first home in Canada. This is the room where chess, badminton and computer games all started.",
    ageFrom: 7, ageTo: 9, outfit: "kid", outfitLabel: "Propeller cap · rainbow lollipop · shorts",
    width: 64, depth: 72, floor: "wood", wall: 0xa9c7d6, trim: 0xf1ead8, background: 0x0e1014, doorLabel: "SCHOOL",
    items: [
      { id: "chess", model: "chess-table", x: -14, z: -16, label: "Chessboard", title: "My first moves.",
        description: "18 Holsworthy Crescent was my first home in Markham, and this is where I first got into chess. I still play, so come challenge me.",
        links: [{ href: LINKS.lichess, label: "Play me on Lichess" }] },
      { id: "agario", model: "computer-desk-agario", x: 22, z: -14, rot: 3, label: "Computer · Agar.io", title: "One more game of Agar.io.",
        description: "This is where computer games started for me. Agar.io was the one I couldn’t put down: eat the pellets, grow your cell, and run from anything bigger than you.",
        links: [{ href: "https://agar.io", label: "Play Agar.io" }] },
      { id: "badminton", model: "badminton-rack", x: 29, z: 14, y: 9, rot: 3, solid: false, label: "Badminton rackets", title: "Away from the screen.",
        description: "Badminton was one of the first sports I fell for. The rackets and shuttlecocks lived on my wall, ready for the next game.",
        links: [{ href: "https://www.badminton.ca", label: "Badminton Canada" }] },
      { id: "kid-bed", model: "bed-kid", x: -22, z: 20, label: "Bed", title: "My little corner.",
        description: "A blue quilt and a pile of pillows at the end of every long day of chess, badminton and games." },
      { id: "lego", model: "lego-shelf", x: -27, z: -6, rot: 1, label: "LEGO shelf", title: "Piece by piece.",
        description: "LEGO sets and Star Wars builds lined this shelf: little projects, long before I wrote any code." },
      { id: "window", model: "window", x: -29, z: -25, y: 12, rot: 1, solid: false, label: "Window", title: "A little daylight.",
        description: "Afternoon light falling in over the LEGO shelf." },
      { id: "posters", model: "starwars-posters", x: -18, z: -33, y: 11, solid: false, label: "Star Wars posters", title: "A galaxy on my wall.",
        description: "Star Wars posters hung on the wall right above the chessboard." },
      { id: "candy", model: "candy-jar", x: 24, z: 2, label: "Candy jar", title: "The sweet corner.",
        description: "A little stash of candy, right beside the computer." },
    ],
    decor: [{ model: "rug-round", x: 0, z: 2, solid: false }, { model: "toy-box", x: 24, z: 26 }, { model: "dresser", x: -25, z: -25, rot: 1 }],
  },
  {
    id: "school", stop: "Primary school", number: "03", place: "Grade 5", location: "Elementary school", heading: "Getting into code.",
    intro: "Grade 5: a perfect score on the Beaver Computing Challenge, Scratch, Python and Raspberry Pis.",
    ageFrom: 10, ageTo: 11, outfit: "starwars", outfitLabel: "Star Wars hoodie · pants · Nike Air Max",
    width: 64, depth: 72, floor: "tile", wall: 0xe6dcc2, trim: 0x5d8a6b, background: 0x0e1014, doorLabel: "ELM AVE",
    items: [
      { id: "beaver", model: "plaque-cemc-gold", x: 18, z: -33, y: 5, solid: false, label: "Beaver Computing Challenge certificate", title: "A perfect score.",
        description: "In grade 5 I wrote the University of Waterloo’s Beaver Computing Challenge and got a perfect score. That result is what really got me into computer programming.",
        links: [{ href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2019/2019BCCResults.pdf", label: "2019 Beaver Computing Challenge results" }] },
      { id: "raspberry-pi", model: "pi-bench", x: 22, z: -8, rot: 3, label: "Raspberry Pis · ECG monitor", title: "Building an ECG monitor.",
        description: "My first real hardware project: an ECG (EKG) heart monitor built on a Raspberry Pi. The code is still up on my GitHub.",
        links: [gh("ecgmonitor", "View the ECG monitor on GitHub")] },
      { id: "scratch", model: "computer-desk-scratch", x: 23, z: 16, rot: 3, label: "Classroom computer · Scratch", title: "Scratch, then Python.",
        description: "Where I started writing programs: calculators and games in Scratch first, then my first Python files.",
        links: [gh("ScratchFiles", "My Scratch projects"), gh("PythonFiles", "My first Python files")] },
      { id: "chalkboard", model: "chalkboard", x: -19, z: -33, y: 9, solid: false, label: "Chalkboard", title: "Grade 5.",
        description: "The year coding went from something I tried to something I wanted to do every single day." },
      { id: "desks", model: "school-desks", x: -18, z: 0, label: "Classroom desks", title: "Back to school.",
        description: "Rows of desks, pencil cases and worksheets. Grade 5 was a big year." },
    ],
    decor: [{ model: "bookshelf-class", x: -27, z: 24, rot: 1 }, { model: "clock", x: -24, z: -33, y: 28, solid: false }, { model: "globe-stand", x: -26, z: -20 }, { model: "classroom-cubbies", x: 27, z: -27 }],
  },
  {
    id: "elm", stop: "Middle school", number: "04", place: "10 Elm Avenue", location: "10 Elm Avenue", heading: "A new house. A new instrument.",
    intro: "We moved into 10 Elm Avenue. I picked up piano and started writing math contests.",
    ageFrom: 11, ageTo: 13, outfit: "starwars", outfitLabel: "Star Wars hoodie · pants · Nike Air Max",
    width: 64, depth: 72, floor: "carpet", wall: 0xb7c4a5, trim: 0xf3efe2, background: 0x0e1014, doorLabel: "BAYVIEW",
    items: [
      { id: "piano", model: "grand-piano", x: -17, z: -15, label: "Yamaha grand piano", title: "Picking up piano.",
        description: "When we moved into 10 Elm Avenue, I picked up piano. The Yamaha grand took up a whole corner of the room.",
        links: [{ href: "https://ca.yamaha.com/en/musical-instruments/pianos/products/grand-pianos/", label: "Yamaha grand pianos" }] },
      { id: "amc8", model: "plaque-maa", x: 29, z: 2, y: 15, rot: 3, solid: false, label: "AMC 8 certificate", title: "Math contests: the AMC 8.",
        description: "Around this time I got into math contests, starting with the AMC 8 from the Mathematical Association of America.",
        links: [{ href: "https://maa.org/student-programs/amc/", label: "About the AMC" }] },
      { id: "elm-desk", model: "computer-desk-code", x: 22, z: -14, rot: 3, label: "Desk & PC", title: "Homework, then code.",
        description: "Homework first, then whatever I was building or playing that week." },
      { id: "elm-bed", model: "bed-navy", x: 22, z: 21, label: "Bed", title: "Lights out.",
        description: "A navy quilt and a reading lamp: the end of every school day." },
      { id: "elm-bookshelf", model: "bookshelf-math", x: -27, z: 27, rot: 1, label: "Bookshelf", title: "Contest prep.",
        description: "Shelves of math books and contest practice, with a LEGO Star Wars build on top." },
      { id: "elm-poster", model: "poster-starwars-big", x: -29, z: 9, y: 12, rot: 1, solid: false, label: "Star Wars poster", title: "Still a Star Wars kid.",
        description: "Still a Star Wars kid. The hoodie proves it." },
    ],
    decor: [{ model: "rug-square", x: 0, z: 6, solid: false }, { model: "basketball", x: 8, z: 24 }, { model: "beanbag", x: -14, z: 28 }, { model: "dresser", x: -26, z: 14, rot: 1 }],
  },
  {
    id: "bayview", stop: "Secondary school", number: "05", place: "Bayview Secondary School", location: "Richmond Hill, Ontario", heading: "High school.",
    intro: "Volleyball, competitive programming, the AIME, Brawl Stars, my own projects, and FBLC, from member to president.",
    ageFrom: 14, ageTo: 17, outfit: "essentials", outfitLabel: "Essentials hoodie · grey sweatpants · Yeezy Slides",
    width: 72, depth: 76, floor: "gym", wall: 0xc8ccd2, trim: 0x23477a, background: 0x0e1014, doorLabel: "WESTERN",
    items: [
      { id: "volleyball", model: "volleyball", x: -12, z: 18, label: "Mikasa volleyball", title: "Off the keyboard. On court.",
        description: "High school is where I picked up volleyball. Follow that side of my life on @ziggyvb.",
        links: [{ href: LINKS.volleyball, label: "Follow @ziggyvb" }] },
      { id: "laptop", model: "macbook", x: 25, z: 6, y: 12, rot: 3, solid: false, label: "MacBook · competitive programming", title: "Competitive programming.",
        description: "Competitive programming took over my evenings: Canadian Computing Competition practice, LeetCode, and a lot of debugging.",
        links: [gh("leetcode", "My LeetCode solutions"), gh("CCC", "My CCC practice")] },
      { id: "aime", model: "plaque-aime", x: 35, z: -28, y: 13, rot: 3, solid: false, label: "AIME qualifier · 2024 & 2025", title: "The AIME.",
        description: "Math contests kept going all the way to the AIME, the American Invitational Mathematics Examination, which I qualified for in 2024 and 2025.",
        links: [{ href: "https://maa.org/student-programs/amc/", label: "About the AIME" }] },
      { id: "maa", model: "plaque-maa", x: 35, z: -15, y: 13, rot: 3, solid: false, label: "MAA · American Mathematics Competitions", title: "American Mathematics Competitions.",
        description: "The Mathematical Association of America runs the AMC and AIME contests. I started with AMC 8 and later qualified for AIME in high school.",
        links: [{ href: "https://maa.org/student-programs/amc/", label: "Visit the MAA contest program" }] },
      { id: "jane-street", model: "jane-street-tees", x: -35, z: -1, y: 12, rot: 1, solid: false, label: "Jane Street T-shirts", title: "Jane Street, 2024 & 2025.",
        description: "Qualifying for the AIME in 2024 and 2025 came with a Jane Street T-shirt each year, from the contest’s partner.",
        links: [{ href: "https://www.janestreet.com", label: "Jane Street" }] },
      { id: "waterloo", model: "plaque-cemc", x: -35, z: -26, y: 12, rot: 1, solid: false, label: "CEMC · Waterloo math contests", title: "Waterloo math contests.",
        description: "University of Waterloo math contests were part of every year of high school: the Fryer, Galois and Hypatia contests in 2022, 2023 and 2025.",
        links: [
          { href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2022/2022FGHResults.pdf", label: "2022 FGH results" },
          { href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2023/2023FGHResults.pdf", label: "2023 FGH results" },
          { href: "https://cemc.uwaterloo.ca/sites/default/files/documents/2025/2025FGHResults.pdf", label: "2025 FGH results" },
        ] },
      { id: "brawlstars", model: "brawl-stand", x: 24, z: -12, label: "Brawl Stars", title: "One more match.",
        description: "Brawl Stars became my go-to game in high school.",
        links: [{ href: "https://supercell.com/en/games/brawlstars/", label: "Brawl Stars" }] },
      { id: "projects", model: "projects-board", x: 35, z: 4, y: 19, rot: 3, solid: false, label: "Projects board", title: "Making things.",
        description: "This is when I started making my own projects. See everything I’ve built, from high school until now.",
        links: [{ href: "/projects", label: "Explore my projects" }, { href: LINKS.github, label: "My GitHub" }] },
      { id: "fblc", model: "fblc-banner", x: -35, z: 26, y: 14, rot: 1, solid: false, label: "FBLC banner", title: "FBLC president.",
        description: "I joined Future Business Leaders of Canada (FBLC) at Bayview and eventually became the club’s president.",
        links: [{ href: "https://fblc.ca", label: "Future Business Leaders of Canada" }] },
      { id: "award-2024", model: "glass-trophy-third", x: -21, z: -31, y: 9, solid: false, label: "Coding & Programming · 3rd place, 2024", title: "Coding & Programming, 2024.",
        description: "Third place in Coding & Programming with FBLA in 2024.",
        links: [LINKEDIN, gh("FBLA", "My 2023–24 FBLA project")] },
      { id: "award-2025", model: "glass-trophy-first", x: 21, z: -31, y: 9, solid: false, label: "Coding & Programming · 1st place, 2025", title: "Coding & Programming, 2025.",
        description: "A year later: first place in Coding & Programming with FBLA in 2025.",
        links: [LINKEDIN] },
    ],
    decor: [
      { model: "volleyball-net", x: -20, z: 7 }, { model: "lockers", x: 31, z: 26, rot: 3 }, { model: "ball-cart", x: 15, z: 30 },
      { model: "coding-desk", x: 24, z: 6, rot: 3 },
      { model: "bench", x: -24, z: 34, rot: 2 },
      { model: "trophy-plinth", x: -21, z: -31 }, { model: "trophy-plinth", x: 21, z: -31 },
    ],
  },
  {
    id: "western", stop: "University", number: "06", place: "Ontario Hall", location: "Western University · London, Ontario", heading: "Where I am now.",
    intro: "Eighteen, in my room in Ontario Hall at Western: Computer Science + Ivey, and three clubs.",
    ageFrom: 18, ageTo: 18, outfit: "western", outfitLabel: "Oversized black Aritzia hoodie & sweatpants · black UGGs",
    width: 88, depth: 96, floor: "laminate", wall: 0x3f3c4e, trim: 0x554463, background: 0x0d0c16, doorLabel: "NEXT",
    items: [
      { id: "degree", model: "cs-ivey", x: 24, z: -45, y: 18, solid: false, label: "CS + Ivey", title: "Computer Science + Ivey.",
        description: "I’m pursuing a dual degree at Western: Computer Science, plus the Ivey Business School’s HBA through Advanced Entry Opportunity (AEO) status.",
        links: [{ href: "https://www.csd.uwo.ca", label: "Western Computer Science" }, { href: "https://www.ivey.uwo.ca/hba/", label: "Ivey HBA" }] },
      { id: "mustangs", model: "go-mustangs", x: 41, z: 9, y: 14, rot: 3, solid: false, label: "Go Mustangs poster", title: "Go Mustangs.",
        description: "A Western Mustangs poster above the bed.", links: [{ href: "https://westernmustangs.ca/", label: "Western Mustangs" }] },
      { id: "csa", model: "poster-csa", x: -41, z: -13, y: 14, rot: 1, solid: false, label: "CSA poster", title: "Chinese Students’ Association.",
        description: "Productions Executive with the Chinese Students’ Association (CSA) at Western.",
        video: { src: "/videos/journey/csa.mp4", label: "CSA at Western", captions: "/videos/journey/csa.en.vtt", poster: "/videos/journey/csa.webp" },
        links: [{ href: "https://csawestern.com/links", label: "CSA Western" }, { href: "https://www.instagram.com/csawestern/", label: "@csawestern" }] },
      { id: "wds", model: "poster-wds", x: -41, z: 2, y: 14, rot: 1, solid: false, label: "Western Developers Society poster", title: "Western Developers Society.",
        description: "Director of Internals at the Western Developers Society.",
        links: [{ href: "https://www.westerndevsociety.ca/", label: "Western Developers Society" }, { href: "https://linktr.ee/westerndevsociety", label: "WDS Linktree" }] },
      { id: "wfn", model: "poster-wfn", x: -41, z: 17, y: 14, rot: 1, solid: false, label: "Western Founders Network poster", title: "Western Founders Network.",
        description: "Director for the Projects portfolio at Western Founders Network.",
        links: [{ href: "https://linktr.ee/westernfoundersnetwork", label: "Western Founders Network" }, { href: "https://www.instagram.com/westernfoundersnetwork/", label: "@westernfoundersnetwork" }] },
      { id: "ohall-bed", model: "bed-western", x: 32, z: 26, label: "Blue and beige bed", title: "My room in O-Hall.",
        description: "My first-year room in Ontario Hall (O-Hall) at Western." },
      { id: "jellycat", model: "jellycat-frog", x: 32, z: 17, y: 7, solid: false, label: "Ricky the Rainfrog", title: "Ricky the Rainfrog.",
        description: "My Jellycat frog, permanent resident of the bed." },
      { id: "standing-desk", model: "standing-desk", x: 34, z: -12, rot: 3, label: "Stand-up desk", title: "Stand-up desk.",
        description: "A stand-up desk for long coding sessions and club work." },
      { id: "monitor", model: "monitor", x: 36, z: -12, y: 18, rot: 3, solid: false, label: "Monitor", title: "Always something compiling.",
        description: "Usually showing code, a pull request, or whatever I’m building next.",
        links: [{ href: LINKS.github, label: "See what I’m building" }] },
      { id: "desk-lamp", model: "desk-lamp", x: 35, z: -21, y: 18, rot: 3, solid: false, label: "Desk lamp", title: "Late-night lighting.",
        description: "Late-night light for late-night commits." },
      { id: "buldak", model: "buldak-bowl", x: 32, z: -3, y: 18, rot: 3, solid: false, label: "Buldak noodles", title: "Buldak at 5 a.m.",
        description: "A bowl of Buldak noodles from our 5 a.m. taste test.",
        video: { src: "/videos/journey/buldak.mp4", label: "Buldak at 5 a.m.", captions: "/videos/journey/buldak.en.vtt", poster: "/videos/journey/buldak.webp" } },
      { id: "mini-fridge", model: "mini-fridge", x: 24, z: -38, label: "Mini fridge", title: "Dorm essentials.",
        description: "Snacks and drinks, within arm’s reach of the desk." },
      { id: "fragrances", model: "fragrances", x: 24, z: -38, y: 13, solid: false, label: "Fragrances", title: "The collection.",
        description: "A small lineup of fragrances on top of the mini fridge." },
      { id: "fan", model: "fan", x: 18, z: 17, y: 9, rot: 3, solid: false, label: "Table fan", title: "Keeping cool.",
        description: "Residence rooms get warm. The fan runs more often than not." },
      { id: "closet", model: "closet", x: -27, z: -39, label: "Closet", title: "All black everything.",
        description: "A closet full of black hoodies and sweatpants, with my volleyball shoes tucked inside." },
      { id: "pink-shoes", model: "pink-court-shoes", x: -25, z: -31, label: "Pink volleyball shoes", title: "Pink volleyball shoes.",
        description: "My pink court shoes, ready for the next volleyball game." },
      { id: "molten", model: "molten-volleyball", x: -32, z: -30, label: "Molten volleyball", title: "Molten volleyball.",
        description: "A Molten volleyball next to my court shoes." },
      { id: "laundry", model: "laundry-basket", x: -36, z: -22, label: "Laundry basket", title: "Residence life.",
        description: "A laundry basket tucked near the closet." },
    ],
    decor: [{ model: "rug-western", x: 2, z: 10, solid: false }, { model: "nightstand", x: 18, z: 17, rot: 3 }],
  },
];

export const CHAPTERS = ROOMS.map(chapter => chapter.outdoor || chapter.id === "western" ? chapter : expandRoom(chapter));
const CHAPTER_ACCENTS = [0x89cced, 0xffcf79, 0x80ddc5, 0xfaac96, 0x91b8f3, 0xc4a2ff];
export const chapterAccent = (index: number) => CHAPTER_ACCENTS[index] ?? CHAPTER_ACCENTS[0];
export const ALL_ITEMS = CHAPTERS.flatMap((chapter, index) => chapter.items.map(item => ({ ...item, chapter: index })));
export const itemById = (id: string) => ALL_ITEMS.find(item => item.id === id);
export const ageLabel = (chapter: Chapter) => chapter.ageFrom === chapter.ageTo ? `${chapter.ageFrom}` : `${chapter.ageFrom}–${chapter.ageTo}`;
