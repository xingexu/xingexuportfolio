#!/usr/bin/env python3
"""
Square crop → smooth circular mask (true transparency, no white mat).
Baby blue ring is drawn *outside* the photo circle only (no PIL stroke into the face).
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw

BABY_BLUE = (140, 200, 248)


def center_square_crop(im: Image.Image) -> Image.Image:
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return im.crop((left, top, left + side, top + side))


def smooth_circle_mask(d: int) -> Image.Image:
    """Anti-aliased disc mask (avoids jagged edges / white speckle)."""
    scale = 4
    big = d * scale
    m = Image.new("L", (big, big), 0)
    ImageDraw.Draw(m).ellipse((0, 0, big - 1, big - 1), fill=255)
    return m.resize((d, d), Image.Resampling.LANCZOS)


def circular_avatar_rgba(im: Image.Image, diameter: int = 420, border: int = 6) -> Image.Image:
    """RGBA in, square WxW out with transparent corners; ring outside content only."""
    if im.mode != "RGBA":
        im = im.convert("RGBA")

    im = im.resize((diameter, diameter), Image.Resampling.LANCZOS)
    r, g, b, a = im.split()
    disc = smooth_circle_mask(diameter)
    a = ImageChops.multiply(a, disc)
    photo = Image.merge("RGBA", (r, g, b, a))

    W = diameter + 2 * border
    ring = np.zeros((W, W, 4), dtype=np.uint8)
    cx = (W - 1) / 2.0
    cy = (W - 1) / 2.0
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float64)
    rr = np.hypot(xx - cx, yy - cy)

    # Ring sits strictly outside the photo disc (no overlap into face)
    r_photo = diameter / 2.0
    r_inner = r_photo + 0.35
    r_outer = r_inner + border
    band = (rr >= r_inner) & (rr <= r_outer)
    ring[band, 0] = BABY_BLUE[0]
    ring[band, 1] = BABY_BLUE[1]
    ring[band, 2] = BABY_BLUE[2]
    ring[band, 3] = 255

    ring_img = Image.fromarray(ring, "RGBA")
    photo_layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    photo_layer.paste(photo, (border, border))

    # Photo on top of ring: opaque face covers ring; transparent outside shows ring
    return Image.alpha_composite(ring_img, photo_layer)


def main() -> int:
    out_dir = Path(__file__).resolve().parent.parent / "public"
    default_src = out_dir / "selfie-source.png"
    src = default_src if default_src.exists() else Path(
        "/Users/zberg_r/.cursor/projects/Users-zberg-r-Xinge/assets/"
        "Screenshot_2026-04-03_at_6.07.03_PM-77738fd5-a880-4cfd-9910-b8c37ad03b85.png"
    )
    if len(sys.argv) >= 2:
        src = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / "avatar.png"

    if not src.exists():
        print(f"Missing source: {src}", file=sys.stderr)
        return 1

    im = Image.open(src)
    im = center_square_crop(im)
    # Never flatten onto white — preserves edges and avoids a white “mat”
    if im.mode != "RGBA":
        im = im.convert("RGBA")

    avatar = circular_avatar_rgba(im)
    avatar.save(dest, "PNG", optimize=True)
    print(f"Wrote {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
