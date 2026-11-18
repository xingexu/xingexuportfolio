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

The `/about` page is a small 3D game: I grow up from age 7 to 18 as you walk forward through six rooms — arriving in Canada, 18 Holsworthy Crescent, grade 5, 10 Elm Avenue, Bayview Secondary, and my room in Ontario Hall at Western. Use **W/S** to move, **A/D** to turn, **E** to inspect the nearest object, and **Esc** to skip an intro or transition. Arrow keys also work. Drag the scene with a mouse or finger, or use the touch joystick. Click or tap an object to inspect it.

- `src/lib/journey/voxel.ts` is a sparse grid with a 3×5 voxel font for signs. `models.ts` draws the props, using a finer grid for details like the MacBook and trophy labels. `avatar.ts` builds the character and `world.ts` builds room shells and handles collisions, reach, spawns and age-by-position.
- `src/lib/journey/data.ts` is the content: chapters, outfits, and every object’s text and links. Add or edit an object there; its position, model and links live in one entry.
- `src/components/JourneyWorld.tsx` renders with three.js at a uniform pixel pitch chosen for the current viewport. It owns input, the follow camera, the skippable intro, and the pixel-dissolve chapter transitions.
- `src/components/About.tsx` is the HUD, object dialogs (with a rotating voxel close-up from `ObjectPreview.tsx`), the finale, and a no-JavaScript list. Browsers without WebGL also get a readable list.

The **Objects** menu lists every room and lets visitors inspect props or jump to a room without walking. Use **Q** to tilt up and **F** to toggle between front and rear views, or tap the camera buttons.

The CSA poster and Buldak noodles show captioned video players at the top of their object dialogs instead of rotating previews. Assets are in `public/videos/journey/`.

For optional background music, set `NEXT_PUBLIC_JOURNEY_MUSIC_URL` before building to a browser-playable audio URL you have permission to publish. The player loops the track only after someone turns music on; without a URL it stays hidden.

Run `npm run test:world` to check that every object has real text and valid links, every model builds, ages run 7 → 18 with the right outfits, every object can be reached on foot, each door leads on (and back), and walls hold the player.

## GitHub activity

`/api/github?year=2026` reads the calendar directly from `github.com/users/xingexu/contributions` and caches it for five minutes. It includes the public and anonymized private contributions shared on the GitHub profile, without exposing private repository names or requiring credentials. Keep **Contribution settings → Private contributions** enabled on your GitHub profile for private activity to appear. The number is GitHub's contribution total (commits, pull requests, reviews, and other qualifying activity), not a count of every commit on every branch.

The parser verifies all dates and checks that daily counts add up to GitHub's headline total. If GitHub changes its calendar markup or is unavailable, the tracker shows a retry option and a link to the profile instead of an incorrect total.

About fills the viewport without the standard site header or footer. A small exit icon returns home. The existing pixel-ink entrance waits for the world's first frame; Escape and reduced motion skip it, and interrupted navigation has a recovery timeout. Other page links retain their short fades. Project sections reveal as they enter the viewport.
