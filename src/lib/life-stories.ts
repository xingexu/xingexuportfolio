import { LINKS } from "@/app/data";

export type MemoryPhoto = { src: string; alt: string; caption?: string };
export type LifeChapter = "airport" | "holsworthy";
export type LifeStory = {
  chapter?: LifeChapter;
  id: string;
  number: string;
  place: string;
  title: string;
  description: string;
  x: number;
  y: number;
  photos: MemoryPhoto[];
  link?: { href: string; label: string };
};

// Only supplied childhood memories are playable. Later interests are kept
// separately until the owner adds the memories that connect the chapters.
export const LIFE_STORIES: LifeStory[] = [
  {
    id: "arrival", chapter: "airport", number: "01", place: "Arriving in Canada", title: "Six years old. A new country.",
    description: "I came to Canada when I was six. This is where the walk begins: getting off the plane, with the rest of my life still ahead of me.",
    x: 365, y: 625, photos: [],
  },
  {
    id: "first-home", chapter: "holsworthy", number: "02", place: "18 Holsworthy · Markham, Ontario", title: "My first home. My first moves.",
    description: "18 Holsworthy was my first house in Markham, Ontario. This is where I learned to play chess. My room had LEGO sets, Star Wars posters, badminton rackets, candy, and a computer playing agar.io.",
    x: 370, y: 488, photos: [],
    link: { href: LINKS.lichess, label: "Play me on Lichess" },
  },
];

export const LATER_STORIES: LifeStory[] = [
  {
    id: "building", number: "02", place: "The workshop", title: "An idea. Then a project.",
    description: "I love to code and turn ideas into things you can actually use. PhotoGit brings version control to Photoshop files. Drift is my first macOS app, built to help students understand their online time.",
    x: 560, y: 570,
    photos: [
      { src: "/images/photogit-preview.png", alt: "PhotoGit project interface", caption: "PhotoGit · September 2026" },
      { src: "/images/drift-preview.png", alt: "Drift macOS app interface", caption: "Drift · July 2026" },
    ],
    link: { href: "/projects", label: "Explore my projects" },
  },
  {
    id: "western", number: "03", place: "Campus", title: "CS + Ivey. Western.",
    description: "Today, I’m 18 and a CS + Ivey student at Western. Coding, building projects, and trying new things are a big part of my life here.",
    x: 940, y: 570, photos: [],
  },
  {
    id: "volleyball", number: "04", place: "The court", title: "Off the keyboard. On court.",
    description: "Volleyball is one of my favourite ways to spend time away from a screen. You can find that part of my life on @ziggyvb.",
    x: 940, y: 230, photos: [],
    link: { href: LINKS.volleyball, label: "Follow @ziggyvb" },
  },
  {
    id: "chess", number: "05", place: "One more game", title: "Your move.",
    description: "I love playing chess. Find me as zinger6767 on Lichess — I’m always up for another game.",
    x: 560, y: 230, photos: [],
    link: { href: LINKS.lichess, label: "Play me on Lichess" },
  },
  {
    id: "food", number: "06", place: "After hours", title: "Somewhere I haven’t tried yet.",
    description: "I love trying new food spots, doing cool stuff, and seeing where the day goes. There’s more to life than the desk.",
    x: 180, y: 230, photos: [],
  },
];
