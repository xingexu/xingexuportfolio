# Hey everyone, I'm Xinge Xu!

You can call me **Zinger**. I'm a first-year student at Western University (UWO), studying Computer Science.

Welcome to my portfolio! This is where I share the projects I'm building :D

Feel free to explore my work or reach out at [xingexu1107@gmail.com](mailto:xingexu1107@gmail.com or xxu767@uwo.ca). I'd be happy to connect!

## Poking around the code

It's a Next.js (App Router) site. Here's where everything lives:

- `src/app/` — routes and pages (home, `/projects`, `/resume`), plus the layout, metadata, sitemap, and the generated Open Graph image.
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
