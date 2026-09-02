#!/usr/bin/env python3
"""Generates every brand artefact from the official Aluza kit.

Single source of truth: assets/brand/aluza-symbol-primary.svg and
assets/brand/aluza-logo-primary.svg. The symbol is never redrawn, stretched or
recoloured here; it is only scaled uniformly and padded.

Outputs:
  src/app/components/AluzaArtwork.generated.ts   paths, view boxes, lengths
  android/.../drawable/ic_launcher_foreground.xml
  android/.../drawable/ic_launcher_monochrome.xml
  android/.../drawable{,-night}/launch_mark.xml, splash_icon.xml
  android/.../mipmap-*/ic_launcher.png, ic_launcher_round.png

Run: python3 scripts/generate-aluza-brand.py
"""

from __future__ import annotations

import math
import os
import re
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DARK = '#1D1D1B'
YELLOW = '#FFC107'
CREAM = '#F6F3EC'
WHITE = '#FFFFFF'

DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

# Share of the icon side taken by the symbol. The rest is margin: the symbol
# itself keeps the kit proportion at every size.
LEGACY_SHARE = 0.60
ROUND_SHARE = 0.55
# 46dp of the 108dp adaptive canvas, inside the 66dp safe zone.
ADAPTIVE_SIZE = 46.0
ADAPTIVE_CANVAS = 108.0
LAUNCH_CANVAS = 96.0


def read_paths(name: str) -> list[tuple[str, str]]:
    source = open(os.path.join(ROOT, 'assets/brand', name), encoding='utf8').read()
    found = re.findall(r'<path d="([^"]+)"[^>]*fill="([^"]+)"', source)
    if not found:
        raise SystemExit(f'no path found in {name}')
    return [(d.strip(), fill.upper()) for d, fill in found]


def subpaths(d: str) -> list[str]:
    return ['M' + part.strip() for part in d.split('M') if part.strip()]


def points_of(sub: str) -> list[tuple[float, float]]:
    numbers = [float(value) for value in re.findall(r'-?\d+(?:\.\d+)?', sub)]
    return list(zip(numbers[0::2], numbers[1::2]))


def bbox(subs: list[str]) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for sub in subs:
        for x, y in points_of(sub):
            xs.append(x)
            ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def outline_length(subs: list[str]) -> float:
    total = 0.0
    for sub in subs:
        pts = points_of(sub)
        for index in range(len(pts)):
            ax, ay = pts[index]
            bx, by = pts[(index + 1) % len(pts)]
            total += math.hypot(bx - ax, by - ay)
    return total


def transform(subs: list[str], scale: float, dx: float, dy: float) -> str:
    out: list[str] = []
    for sub in subs:
        pts = points_of(sub)
        parts = [f'M{pts[0][0] * scale + dx:.2f},{pts[0][1] * scale + dy:.2f}']
        for x, y in pts[1:]:
            parts.append(f'L{x * scale + dx:.2f},{y * scale + dy:.2f}')
        parts.append('Z')
        out.append(' '.join(parts))
    return ' '.join(out)


def normalise(subs: list[str], box, size: float, share: float) -> str:
    """Uniform scale into `size`, keeping the kit proportion, then centre."""
    min_x, min_y, max_x, max_y = box
    width = max_x - min_x
    height = max_y - min_y
    scale = (size * share) / max(width, height)
    dx = (size - width * scale) / 2 - min_x * scale
    dy = (size - height * scale) / 2 - min_y * scale
    return transform(subs, scale, dx, dy)


# --------------------------------------------------------------------------
# Rasteriser: even-odd polygon fill, 4x supersampled, written as PNG.
# --------------------------------------------------------------------------

SAMPLES = 4


def rasterise(polygons, size, background, circle_mask):
    big = size * SAMPLES
    canvas = [[background[0], background[1], background[2], background[3] if len(background) > 3 else 255]
              for _ in range(big * big)]
    if circle_mask:
        radius = big / 2
        for y in range(big):
            for x in range(big):
                if math.hypot(x + 0.5 - radius, y + 0.5 - radius) > radius:
                    canvas[y * big + x] = [0, 0, 0, 0]

    for subs, colour in polygons:
        rgb = (int(colour[1:3], 16), int(colour[3:5], 16), int(colour[5:7], 16))
        edges = []
        for sub in subs:
            pts = points_of(sub)
            for index in range(len(pts)):
                ax, ay = pts[index]
                bx, by = pts[(index + 1) % len(pts)]
                if ay != by:
                    edges.append((ax * SAMPLES, ay * SAMPLES, bx * SAMPLES, by * SAMPLES))
        for y in range(big):
            sample_y = y + 0.5
            crossings = []
            for ax, ay, bx, by in edges:
                if (ay <= sample_y < by) or (by <= sample_y < ay):
                    crossings.append(ax + (sample_y - ay) * (bx - ax) / (by - ay))
            if not crossings:
                continue
            crossings.sort()
            for index in range(0, len(crossings) - 1, 2):
                start = max(0, int(math.ceil(crossings[index] - 0.5)))
                end = min(big - 1, int(math.floor(crossings[index + 1] - 0.5)))
                row = y * big
                for x in range(start, end + 1):
                    pixel = canvas[row + x]
                    pixel[0], pixel[1], pixel[2], pixel[3] = rgb[0], rgb[1], rgb[2], 255

    out = bytearray()
    factor = SAMPLES * SAMPLES
    for y in range(size):
        out.append(0)
        for x in range(size):
            r = g = b = a = 0
            for sy in range(SAMPLES):
                row = (y * SAMPLES + sy) * big + x * SAMPLES
                for sx in range(SAMPLES):
                    pixel = canvas[row + sx]
                    alpha = pixel[3]
                    r += pixel[0] * alpha
                    g += pixel[1] * alpha
                    b += pixel[2] * alpha
                    a += alpha
            if a == 0:
                out += bytes((0, 0, 0, 0))
            else:
                out += bytes((round(r / a), round(g / a), round(b / a), round(a / factor)))
    return bytes(out)


def write_png(path: str, size: int, raw: bytes) -> None:
    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (struct.pack('>I', len(payload)) + tag + payload
                + struct.pack('>I', zlib.crc32(tag + payload) & 0xFFFFFFFF))

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    data = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)


def vector(canvas: float, dp: float, entries) -> str:
    body = '\n'.join(
        f'    <path\n'
        f'        android:fillColor="{colour}"\n'
        f'        android:fillType="evenOdd"\n'
        f'        android:pathData="{data}" />'
        for data, colour in entries
    )
    return (
        '<!-- Generated by scripts/generate-aluza-brand.py from the Aluza kit. '
        'Do not edit. -->\n'
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        f'    android:width="{dp:g}dp"\n'
        f'    android:height="{dp:g}dp"\n'
        f'    android:viewportWidth="{canvas:g}"\n'
        f'    android:viewportHeight="{canvas:g}">\n'
        f'{body}\n'
        '</vector>\n'
    )


def main() -> None:
    symbol = read_paths('aluza-symbol-primary.svg')
    logo = read_paths('aluza-logo-primary.svg')

    symbol_ink = subpaths(next(d for d, fill in symbol if fill == DARK))
    symbol_sun = subpaths(next(d for d, fill in symbol if fill == YELLOW))
    logo_ink = subpaths(next(d for d, fill in logo if fill == DARK))

    known = set(symbol_ink)
    wordmark = [sub for sub in logo_ink if sub not in known]
    if len(wordmark) != len(logo_ink) - len(symbol_ink):
        raise SystemExit('the logo no longer contains the symbol verbatim')

    symbol_box = bbox(symbol_ink + symbol_sun)
    wordmark_box = bbox(wordmark)
    sun_box = bbox(symbol_sun)

    # --- React Native artwork -------------------------------------------
    sx, sy, ex, ey = symbol_box
    wx, wy, wex, wey = wordmark_box
    symbol_ink_view = transform(symbol_ink, 1, -sx, -sy)
    symbol_sun_view = transform(symbol_sun, 1, -sx, -sy)
    wordmark_view = transform(wordmark, 1, -wx, -wy)
    length = outline_length(symbol_ink)

    artwork = f'''// Generated by scripts/generate-aluza-brand.py. Do not edit.
// Source: assets/brand/aluza-symbol-primary.svg, assets/brand/aluza-logo-primary.svg

export const ALUZA_COLORS = {{
  ink: '{DARK}',
  sun: '{YELLOW}',
  cream: '{CREAM}',
  white: '#FFFFFF',
}} as const;

/** Tight box of the symbol, so padding is the only adaptation ever made. */
export const ALUZA_SYMBOL_VIEWBOX = '0 0 {ex - sx:.2f} {ey - sy:.2f}';
export const ALUZA_SYMBOL_SIZE = {{
  width: {ex - sx:g},
  height: {ey - sy:g},
}} as const;

/** Length of the symbol contour, for the stroke-dash draw on the splash. */
export const ALUZA_SYMBOL_OUTLINE_LENGTH = {length:.0f};

/** Centre of the yellow detail inside the symbol view box. */
export const ALUZA_SUN_CENTER = {{
  x: {(sun_box[0] + sun_box[2]) / 2 - sx:g},
  y: {(sun_box[1] + sun_box[3]) / 2 - sy:g},
}} as const;

export const ALUZA_SYMBOL_INK_PATH =
  '{symbol_ink_view}';

export const ALUZA_SYMBOL_SUN_PATH =
  '{symbol_sun_view}';

export const ALUZA_WORDMARK_VIEWBOX = '0 0 {wex - wx:.2f} {wey - wy:.2f}';
export const ALUZA_WORDMARK_RATIO = {(wex - wx) / (wey - wy):.4f};

export const ALUZA_WORDMARK_PATH =
  '{wordmark_view}';
'''
    open(os.path.join(ROOT, 'src/app/components/AluzaArtwork.generated.ts'), 'w',
         encoding='utf8').write(artwork)

    # --- Android vectors -------------------------------------------------
    drawable = os.path.join(ROOT, 'android/app/src/main/res/drawable')
    adaptive_share = ADAPTIVE_SIZE / ADAPTIVE_CANVAS
    open(os.path.join(drawable, 'ic_launcher_foreground.xml'), 'w', encoding='utf8').write(
        vector(ADAPTIVE_CANVAS, ADAPTIVE_CANVAS, [
            (normalise(symbol_ink, symbol_box, ADAPTIVE_CANVAS, adaptive_share), DARK),
            (normalise(symbol_sun, symbol_box, ADAPTIVE_CANVAS, adaptive_share), YELLOW),
        ]))
    open(os.path.join(drawable, 'ic_launcher_monochrome.xml'), 'w', encoding='utf8').write(
        vector(ADAPTIVE_CANVAS, ADAPTIVE_CANVAS, [
            (normalise(symbol_ink, symbol_box, ADAPTIVE_CANVAS, adaptive_share), DARK),
            (normalise(symbol_sun, symbol_box, ADAPTIVE_CANVAS, adaptive_share), DARK),
        ]))
    # The launch window and the Android 12+ splash, in both appearances: on the
    # dark background the symbol is drawn in white, never in ink on ink.
    drawable_night = os.path.join(ROOT, 'android/app/src/main/res/drawable-night')
    os.makedirs(drawable_night, exist_ok=True)
    for folder, ink in ((drawable, DARK), (drawable_night, WHITE)):
        open(os.path.join(folder, 'launch_mark.xml'), 'w', encoding='utf8').write(
            vector(LAUNCH_CANVAS, LAUNCH_CANVAS, [
                (normalise(symbol_ink, symbol_box, LAUNCH_CANVAS, 0.86), ink),
                (normalise(symbol_sun, symbol_box, LAUNCH_CANVAS, 0.86), YELLOW),
            ]))
        # Android 12+ masks the splash icon to a circle and only the inner two
        # thirds are safe, so the symbol sits smaller inside the canvas.
        open(os.path.join(folder, 'splash_icon.xml'), 'w', encoding='utf8').write(
            vector(ADAPTIVE_CANVAS, ADAPTIVE_CANVAS, [
                (normalise(symbol_ink, symbol_box, ADAPTIVE_CANVAS, 0.52), ink),
                (normalise(symbol_sun, symbol_box, ADAPTIVE_CANVAS, 0.52), YELLOW),
            ]))

    # --- Legacy mipmaps ---------------------------------------------------
    cream = (int(CREAM[1:3], 16), int(CREAM[3:5], 16), int(CREAM[5:7], 16), 255)
    for density, size in DENSITIES.items():
        folder = os.path.join(ROOT, 'android/app/src/main/res', f'mipmap-{density}')
        for filename, share, circle in (
            ('ic_launcher.png', LEGACY_SHARE, False),
            ('ic_launcher_round.png', ROUND_SHARE, True),
        ):
            ink = [normalise(symbol_ink, symbol_box, float(size), share)]
            sun = [normalise(symbol_sun, symbol_box, float(size), share)]
            raw = rasterise(
                [(subpaths(ink[0]), DARK), (subpaths(sun[0]), YELLOW)],
                size, cream, circle,
            )
            write_png(os.path.join(folder, filename), size, raw)
            print(f'{density}/{filename}')

    print('symbol box', symbol_box, 'outline length', round(length))


if __name__ == '__main__':
    main()
