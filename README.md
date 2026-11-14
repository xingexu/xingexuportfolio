# Hey everyone, I'm Xinge Xu!

You can call me **Zinger**. I'm a first-year student at Western University (UWO), studying Computer Science.

Welcome to my portfolio! This is where I share the projects I'm building :D

Feel free to explore my work or reach out at [xingexu1107@gmail.com](mailto:xingexu1107@gmail.com or xxu767@uwo.ca). I'd be happy to connect!

## Poking around the code

It's a Next.js (App Router) site. Here's where everything lives:

- `src/app/` — routes and pages (home, `/about`, `/projects`, `/resume`), plus the layout, metadata, sitemap, and the generated Open Graph image.
- `src/components/` — the actual UI: the animated day/night `Background`, the `Hero` section, `Resume`, `Projects`, and the small bits like `Nav` and `Footer`.
- `src/lib/` — small shared helpers (right now, just the audio context used for sound effects).
- `public/images/` — photos and animation frames used around the site.
- `public/resume/` — the resume PDF and the old flipbook frames it used to be built from.
- `public/icons/` — the default Next.js starter icons (mostly unused, kept around just in case).
- `scripts/` — one-off Python scripts, like the one that generates the circular avatar from a source photo.

```
npm install
npm run dev
```

Then open `http://localhost:3000` and you're good to go.

The `/about` page is a walk through two childhood chapters: arriving in Canada and the first home at 18 Holsworthy in Markham, Ontario, where Xinge learned chess. Use **WASD or arrow keys** to walk, **E** to open a nearby story, **M** for the airport map, and **Escape** to close a story or skip the entrance. Phones show a hold-to-walk directional pad. A persistent next-step guide leads through the stairs, memory, arrivals, baggage claim, meeting point, and exit; its arrow routes around obstacles if visitors wander. The map shows the player and next destination and provides stories as ordinary buttons, so visitors can read without playing.

- `src/lib/life-world.ts` draws a continuous apron and terminal with blue glass, cream floors, yellow markings, red aircraft accents, moving baggage, carts, seating, plants, and travellers. Its integer pixel grid also defines collisions, normalized movement, and the camera bounds. Static artwork is cached. Ambient motion can be paused, respects reduced motion, and stops when the tab is hidden.
- `src/components/LifeWorld.tsx` handles input, camera, resizing, readiness, both scenes, pixel chapter transitions, and the minimap. Opening a story or losing focus clears held movement keys.
- `src/lib/life-stories.ts` exposes the supplied arrival and Holsworthy/chess memories, each scoped to its chapter. Present-day interests and existing project screenshots are retained in inactive `LATER_STORIES`, ready for later chapters; they do not appear in the current airport. No intermediate events or dates are invented.
- `src/components/About.tsx` provides accessible story dialogs, the airport map, controls, and the no-JavaScript arrival story.

To add a personal photo, put the approved image in `public/images/memories/`, then add `{ src: "/images/memories/name.jpg", alt: "Description of the photo", caption: "The memory and date" }` to the relevant story’s `photos` array. Only supplied photos and confirmed events should be added. The child starts on the stairs of an unbranded plane. Hold S or the down control to step onto the apron, follow the yellow path right and then up into arrivals, and explore baggage claim and the meeting area. This is one connected environment, with walkable doors and solid walls. Walking through the eastern airport exit transitions to Holsworthy. The front door leads to the chess table; approach and press E, tap the action, or click the table to read the memory. Walking down through the garden gate returns to the airport. The character stays six everywhere, with no automatic growth or jump to adult chapters.

All travellers share `src/lib/pixel-person.ts` for consistent faces, limbs, and pixel proportions. The tiny player wears a black tee, long pants, and a propeller cap, and holds a rainbow lollipop. Walking uses distance-based planted-foot poses, frame-rate-independent acceleration, and an immediate stop when controls are released. `src/lib/airport-guide.ts` and `src/lib/home-world.ts` own the chapter guides; `src/lib/world-navigation.ts` caches routes around obstacles for both worlds. The home is a stylized pixel interior, not a reconstruction of an actual floor plan. `src/lib/pixel-chess.ts` draws an 8×8 board with all 32 starting pieces, shared by the room and memory dialog.

Run `npm run test:world` to check that the memory and all airport areas are reachable, diagonal speed is normalized, walls and props hold the player, the plane-to-terminal route is continuous, and the child stays six. It also checks movement across frame rates, stopping without drift, the complete guided walk to the exit, returning to the memory from off-route locations, the home doorway and chess approach, chapter-specific memories, and the starting chess position.

## GitHub activity

`/api/github?year=2026` reads the calendar directly from `github.com/users/xingexu/contributions` and caches it for five minutes. It includes the public and anonymized private contributions shared on the GitHub profile, without exposing private repository names or requiring credentials. Keep **Contribution settings → Private contributions** enabled on your GitHub profile for private activity to appear. The number is GitHub's contribution total (commits, pull requests, reviews, and other qualifying activity), not a count of every commit on every branch.

The parser verifies all dates and checks that daily counts add up to GitHub's headline total. If GitHub changes its calendar markup or is unavailable, the tracker shows a retry option and a link to the profile instead of an incorrect total.

About fills the viewport without the standard site header or footer. A small exit icon returns home. The existing pixel-ink entrance waits for the world's first frame; Escape and reduced motion skip it, and interrupted navigation has a recovery timeout. Other page links retain their short fades. Project sections reveal as they enter the viewport.
