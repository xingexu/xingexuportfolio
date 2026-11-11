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

The `/about` page uses a layered grayscale pixel-art computer room with an eight-second ambient animation loop. `AboutSprites.tsx` contains the palette-limited pixel sprites; `AboutField.tsx` plays the room animation drawn in `src/lib/about-room.ts`. Every background mark sits on a uniform three-pixel grid, with restrained material grain and five-band dithered glows around the display, ceiling lights, and computer fans. No blur is used. Static artwork and light masks are cached per size. One 60px-wide knight links to Lichess, and one 60px yellow-and-blue Mikasa-style volleyball links to the volleyball Instagram, using `LINKS` in `src/app/data.ts`. The central display shows illustrative, animated stock candlesticks, volume bars, and small market charts. ZINGER uses larger beveled seven-by-nine glyphs with square-cell halos, independently phased, smooth eight-second floating motion and a matching glow cycle. The volleyball uses a 30-by-30 pixel face with curved blue ribbons, panel seams, and spherical shading; both interest sprites float gently without step rotation. Pause and reduced motion cover the room, letters, glows, and sprites. ZINGER is the only visible lettering in the room.

## GitHub activity

`/api/github?year=2026` reads the calendar directly from `github.com/users/xingexu/contributions` and caches it for five minutes. It includes the public and anonymized private contributions shared on the GitHub profile, without exposing private repository names or requiring credentials. Keep **Contribution settings → Private contributions** enabled on your GitHub profile for private activity to appear. The number is GitHub's contribution total (commits, pull requests, reviews, and other qualifying activity), not a count of every commit on every branch.

The parser verifies all dates and checks that daily counts add up to GitHub's headline total. If GitHub changes its calendar markup or is unavailable, the tracker shows a retry option and a link to the profile instead of an incorrect total.

About is a full-viewport room without the site header or footer. A small exit icon returns home; the other corner controls ambient motion. Entering About corrodes the outgoing colored sky, then staggered ink splats and small satellite droplets spread across the darkness and merge to expose the complete live room, letters, and objects together. The edges remain on the room's three-pixel grid, with continuous opacity and a 2.8-second reveal. The overlay waits for the room's first frame. The full entrance takes about 3.8 seconds on a loaded route, also runs on direct About loads, and can be skipped with Escape. Reduced motion skips the sequence entirely; navigation recovery and a CSS timeout keep interrupted loads usable. Other page links retain their short fades. Project sections reveal as they enter the viewport.
