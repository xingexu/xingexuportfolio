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

The `/about` page is a playable pixel world. Use **WASD or arrow keys** to walk, **E** to open a nearby story, **M** for the story map, and **Escape** to close a story or skip the entrance. Phones show a hold-to-walk directional pad. The map also provides all stories as ordinary buttons, so visitors can read without playing.

- `src/lib/life-world.ts` draws the grayscale islands, bridges, props, and four-direction walking sprite on an integer pixel grid. It also defines collision geometry and normalized movement. Static artwork is cached; the camera follows the character. Ambient motion can be paused, respects reduced motion, and stops when the tab is hidden.
- `src/components/LifeWorld.tsx` handles input, camera, resizing, readiness, and the minimap. Opening a story or losing focus clears held movement keys.
- `src/lib/life-stories.ts` contains the real biography, project screenshots, profile links, and story positions. These locations are interests, not an invented chronological life history.
- `src/components/About.tsx` provides accessible story dialogs, discovery progress, controls, and the no-JavaScript biography.

To add a personal photo, put the approved image in `public/images/memories/`, then add `{ src: "/images/memories/name.jpg", alt: "Description of the photo", caption: "The memory and date" }` to the relevant story’s `photos` array. Only supplied photos and confirmed events should be added. The initial world covers the introduction, coding/projects, Western, volleyball, chess, and food.

Run `npm run test:world` to check that every story is reachable, diagonal speed is normalized, obstacles and edges hold the player, and the first bridge can be crossed continuously.

## GitHub activity

`/api/github?year=2026` reads the calendar directly from `github.com/users/xingexu/contributions` and caches it for five minutes. It includes the public and anonymized private contributions shared on the GitHub profile, without exposing private repository names or requiring credentials. Keep **Contribution settings → Private contributions** enabled on your GitHub profile for private activity to appear. The number is GitHub's contribution total (commits, pull requests, reviews, and other qualifying activity), not a count of every commit on every branch.

The parser verifies all dates and checks that daily counts add up to GitHub's headline total. If GitHub changes its calendar markup or is unavailable, the tracker shows a retry option and a link to the profile instead of an incorrect total.

About fills the viewport without the standard site header or footer. A small exit icon returns home. The existing pixel-ink entrance waits for the world's first frame; Escape and reduced motion skip it, and interrupted navigation has a recovery timeout. Other page links retain their short fades. Project sections reveal as they enter the viewport.
