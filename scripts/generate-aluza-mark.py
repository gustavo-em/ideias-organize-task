#!/usr/bin/env python3
"""Draws every surface of the app's mark from one vector source.

Single source of truth: assets/brand/aluza-mark-source.svg — the letter as one
even-odd path and the light as three capsules. The tile behind them belongs to
the icon, not to the mark: the splash and the launch window paint their own
ground, so the layers are cut out on transparency and the tile is only drawn
where an icon is actually being made.

The drawing arrives clean, so it is rasterised as it is: no smoothing pass,
because smoothing would move a curve somebody chose. The rasteriser, the PNG
writers and the path maths live in `aluza_raster.py`, which knows nothing about
what the mark looks like.

Outputs:
  assets/brand/aluza-mark-letter.png, aluza-mark-rays.png   the splash's layers
  assets/brand/aluza-mark-{on-sol,on-tinta,primary}.png     the three grounds
  ios/.../LaunchMark.imageset/launch-mark*.png              the launch window

Run: python3 scripts/generate-aluza-mark.py
"""

from __future__ import annotations

import importlib.util
import math
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets/brand/aluza-mark-source.svg')

_spec = importlib.util.spec_from_file_location(
    'aluza_raster', os.path.join(ROOT, 'scripts/aluza_raster.py'))
brand = importlib.util.module_from_spec(_spec)
sys.modules['aluza_raster'] = brand
_spec.loader.exec_module(brand)

INK = '#1B1710'
PAPER = '#FBF3E1'
SUN = '#FFC63D'
WHITE = '#FFFFFF'


# ---------------------------------------------------------------------------
# The source, read as geometry
# ---------------------------------------------------------------------------

NUMBER = re.compile(r'-?\d*\.?\d+(?:[eE][-+]?\d+)?')


def subpaths_of(data: str):
    """`d` as the (start, segments) pairs the rasteriser takes.

    Only the commands this drawing uses are honoured — absolute move, line,
    cubic and close. Anything else is a re-export that changed shape, and is
    worth stopping for rather than guessing at.
    """
    tokens = re.findall(r'[MLCZmlcz]|' + NUMBER.pattern, data)
    subs = []
    start = current = None
    segments: list = []
    index = 0

    def number():
        nonlocal index
        value = float(tokens[index])
        index += 1
        return value

    while index < len(tokens):
        command = tokens[index]
        if command not in 'MLCZmlcz':
            raise SystemExit(f'unexpected token {command!r} in the path')
        index += 1

        if command in 'Mm':
            if segments:
                subs.append((start, segments))
            start = current = (number(), number())
            segments = []
        elif command in 'Ll':
            current = (number(), number())
            segments.append(('L', current))
        elif command in 'Cc':
            c1 = (number(), number())
            c2 = (number(), number())
            current = (number(), number())
            segments.append(('C', c1, c2, current))
        else:
            if segments:
                subs.append((start, segments))
            segments = []
            current = start

    if segments:
        subs.append((start, segments))

    return subs


def capsule(x, y, width, height, rx, angle, cx, cy, steps=24):
    """One ray: a rounded rectangle, turned about its own centre.

    Drawn as line segments rather than curves because the rasteriser flattens
    everything anyway, and a capsule has no straight answer in cubics that is
    worth the arithmetic.
    """
    ry = min(rx, height / 2)
    rx = min(rx, width / 2)
    left, right = x + rx, x + width - rx
    top, bottom = y + ry, y + height - ry
    points = []

    for corner_x, corner_y, base in (
        (right, top, -math.pi / 2),
        (right, bottom, 0.0),
        (left, bottom, math.pi / 2),
        (left, top, math.pi),
    ):
        for step in range(steps + 1):
            theta = base + (math.pi / 2) * step / steps
            points.append((corner_x + rx * math.cos(theta),
                           corner_y + ry * math.sin(theta)))

    radians = math.radians(angle)
    cos, sin = math.cos(radians), math.sin(radians)

    def turn(point):
        dx, dy = point[0] - cx, point[1] - cy
        return (cx + dx * cos - dy * sin, cy + dx * sin + dy * cos)

    turned = [turn(point) for point in points]
    return (turned[0], [('L', point) for point in turned[1:]])


def read_source():
    svg = open(SOURCE, encoding='utf8').read()

    letters = re.findall(r'<path[^>]*\bd="([^"]+)"', svg)
    if len(letters) != 1:
        raise SystemExit(f'expected one letter path, found {len(letters)}')

    rays = []
    for tag in re.findall(r'<rect[^>]*>', svg):
        # The light is the only white rounded shape: the page behind the icon
        # is white but square, and the tile is rounded but yellow.
        if 'rx=' not in tag or WHITE not in tag.upper():
            continue
        def value(name, fallback=0.0):
            found = re.search(name + r'="([^"]+)"', tag)
            return float(found.group(1)) if found else fallback

        turn = re.search(r'rotate\(([^)]+)\)', tag)
        angle, cx, cy = (0.0, 0.0, 0.0)
        if turn:
            angle, cx, cy = (float(part) for part in turn.group(1).split())

        rays.append(capsule(value('x'), value('y'), value('width'),
                            value('height'), value('rx'), angle, cx, cy))

    if len(rays) != 3:
        raise SystemExit(f'expected three rays, found {len(rays)}')

    return subpaths_of(letters[0]), rays


# ---------------------------------------------------------------------------
# The surfaces
# ---------------------------------------------------------------------------

def main() -> None:
    letter, rays = read_source()

    # One frame for both layers, so the letter and the light stay registered
    # wherever they are drawn. The margin is what keeps the light off the edge.
    box = brand.squared(brand.bbox(letter + rays))
    SHARE = 0.94

    def draw(size: int, ink: str, sun: str, ground=None):
        return brand.rasterise(
            [
                (brand.normalise(letter, box, float(size), SHARE), ink),
                (brand.normalise(rays, box, float(size), SHARE), sun),
            ],
            size, ground, False,
        )

    def write(path: str, size: int, raw: bytes):
        brand.write_png(os.path.join(ROOT, path), size, raw)
        print(f'{path} {size}x{size}')

    # The splash animates the letter and the light apart, so it needs each on
    # its own. Same frame, so they land back on top of each other.
    for name, subs, colour in (
        ('aluza-mark-letter.png', letter, INK),
        ('aluza-mark-rays.png', rays, WHITE),
    ):
        raw = brand.rasterise(
            [(brand.normalise(subs, box, 512.0, SHARE), colour)],
            512, None, False,
        )
        write(f'assets/brand/{name}', 512, raw)

    # The three grounds the brand screens sit on. On Sol the light is white, so
    # it reads as light rather than as a second yellow on a yellow floor.
    for name, ink, sun in (
        ('aluza-mark-on-sol.png', INK, WHITE),
        ('aluza-mark-on-tinta.png', PAPER, SUN),
        ('aluza-mark-primary.png', INK, SUN),
    ):
        write(f'assets/brand/{name}', 512, draw(512, ink, sun))

    # What React Native draws: the same geometry as paths, so the splash can
    # animate the letter and the light apart without a bitmap in the way, plus
    # the measurements the opening needs. Measured here rather than by eye:
    # the rows have to land *on* the rays, and a few points off reads as three
    # bars parked next to a mark.
    FRAME = 1000.0
    letter_frame = brand.normalise(letter, box, FRAME, SHARE)
    rays_frame = brand.normalise(rays, box, FRAME, SHARE)

    def centre(subs):
        min_x, min_y, max_x, max_y = brand.bbox(subs)
        return ((min_x+max_x)/2/FRAME, (min_y+max_y)/2/FRAME)

    # The bowl is the letter's second contour — the hole. The opening grows out
    # of its middle, not out of the middle of the picture.
    bowl = centre([letter_frame[1]])
    ray_centres = [centre([sub]) for sub in rays_frame]

    generated = os.path.join(ROOT, 'src/app/components/AluzaMark.generated.ts')
    lines = [
        '// Generated by scripts/generate-aluza-mark.py. Do not edit.',
        '// Source: assets/brand/aluza-mark-source.svg',
        '',
        "export const ALUZA_MARK_VIEWBOX = '0 0 %d %d';" % (FRAME, FRAME),
        '',
        '/** The letter, one even-odd path: the outer contour and its bowl. */',
        "export const ALUZA_MARK_LETTER_PATH =\n  '%s';" % brand.path_data(letter_frame),
        '',
        '/** The light, one path per ray, in the order the opening lands them. */',
        'export const ALUZA_MARK_RAY_PATHS = [',
    ]
    for sub in rays_frame:
        lines.append("  '%s'," % brand.path_data([sub]))
    lines += [
        '] as const;',
        '',
        '/** Centre of each ray, as a share of the frame. */',
        'export const ALUZA_MARK_RAY_CENTERS = [',
    ]
    for x, y in ray_centres:
        lines.append('  { x: %.4f, y: %.4f },' % (x, y))
    lines += [
        '] as const;',
        '',
        '/** Middle of the letter\'s bowl, where the opening grows from. */',
        'export const ALUZA_MARK_OPEN_AT = { x: %.4f, y: %.4f } as const;' % bowl,
        '',
    ]
    open(generated, 'w', encoding='utf8').write('\n'.join(lines))
    print('src/app/components/AluzaMark.generated.ts')

    # The iOS launch window, at the storyboard's 96pt box. One appearance, not
    # two: that window is Sol whatever the phone is set to, so the mark is the
    # icon's own paint — ink letter, white light — and a dark cut would only be
    # a second drawing waiting to go out of step.
    imageset = 'ios/IdeiasOrganizeTask/Images.xcassets/LaunchMark.imageset'
    entries = []
    for scale in (1, 2, 3):
        size = 96 * scale
        tail = '' if scale == 1 else f'@{scale}x'
        name = f'launch-mark{tail}.png'
        write(f'{imageset}/{name}', size, draw(size, INK, WHITE))
        entries.append('    {\n      "filename" : "%s",\n'
                       '      "idiom" : "universal",\n'
                       '      "scale" : "%dx"\n    }' % (name, scale))

    open(os.path.join(ROOT, imageset, 'Contents.json'), 'w',
         encoding='utf8').write(
        '{\n  "images" : [\n' + ',\n'.join(entries)
        + '\n  ],\n  "info" : {\n    "author" : "xcode",\n'
        '    "version" : 1\n  }\n}\n')
    print(f'{imageset}/Contents.json')

    # Android's launch window and its Android 12 splash. Vectors, so the same
    # geometry travels; the same paint as iOS, because both grounds are Sol.
    # The night copies are identical on purpose — the ground does not change,
    # so neither does the mark — but the folder has to exist or a light-mode
    # phone finds a resource that is only declared for night.
    def android_vector(canvas: float, dp: float, share: float) -> str:
        body = '\n'.join(
            f'    <path\n'
            f'        android:fillColor="{colour}"\n'
            f'        android:fillType="evenOdd"\n'
            f'        android:pathData="{brand.path_data(brand.normalise(subs, box, canvas, share))}" />'
            for subs, colour in ((letter, INK), (rays, WHITE))
        )
        return (
            '<!-- Generated by scripts/generate-aluza-mark.py. Do not edit. -->\n'
            '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
            f'    android:width="{dp:g}dp"\n'
            f'    android:height="{dp:g}dp"\n'
            f'    android:viewportWidth="{canvas:g}"\n'
            f'    android:viewportHeight="{canvas:g}">\n'
            f'{body}\n</vector>\n'
        )

    LAUNCH_CANVAS, ADAPTIVE_CANVAS = 96.0, 108.0
    for folder in ('drawable', 'drawable-night'):
        root = os.path.join(ROOT, 'android/app/src/main/res', folder)
        os.makedirs(root, exist_ok=True)
        open(os.path.join(root, 'launch_mark.xml'), 'w', encoding='utf8').write(
            android_vector(LAUNCH_CANVAS, LAUNCH_CANVAS, SHARE))
        # Android 12 masks the splash icon to a circle and only the inner two
        # thirds are safe, so the mark sits smaller inside the canvas.
        open(os.path.join(root, 'splash_icon.xml'), 'w', encoding='utf8').write(
            android_vector(ADAPTIVE_CANVAS, ADAPTIVE_CANVAS, 0.52))
        print(f'android/{folder}/launch_mark.xml, splash_icon.xml')

    write_icons(letter, rays)
    write_android_icons(letter, rays, box)


def write_android_icons(letter, rays, box):
    """Android's launcher icon: the adaptive foreground and the legacy squares.

    The adaptive foreground is the mark alone on transparency — Android draws
    the tile itself from `brand_icon_background`, and masks the pair to
    whatever shape the launcher uses, so the mark has to sit inside the safe
    zone rather than fill the canvas. The legacy files still carry their own
    tile, for launchers old enough not to know about the pair.
    """
    DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    ADAPTIVE_DP, LEGACY_DP = 108, 48
    # 46dp of the 108dp canvas, inside the 66dp safe zone.
    ADAPTIVE_SHARE = 46.0 / ADAPTIVE_DP
    LEGACY_SHARE, ROUND_SHARE = 0.60, 0.55
    ground = (0xFA, 0xA8, 0x05)

    def paint(size, share, ground_rgb, circle):
        return brand.rasterise(
            [
                (brand.normalise(letter, box, float(size), share), INK),
                (brand.normalise(rays, box, float(size), share), WHITE),
            ],
            size, ground_rgb, circle,
        )

    for density, scale in DENSITIES.items():
        folder = f'android/app/src/main/res/mipmap-{density}'
        for name, dp, share, bg, circle in (
            ('ic_launcher_foreground.png', ADAPTIVE_DP, ADAPTIVE_SHARE, None, False),
            ('ic_launcher.png', LEGACY_DP, LEGACY_SHARE, ground, False),
            ('ic_launcher_round.png', LEGACY_DP, ROUND_SHARE, ground, True),
        ):
            size = int(dp * scale)
            brand.write_png(os.path.join(ROOT, folder, name), size,
                            paint(size, share, bg, circle))
        print(f'{folder}/ic_launcher*.png')


def write_icons(letter, rays):
    """The app icon, drawn the way the source draws it.

    The tile is part of the icon and only of the icon, so it is taken from the
    source rect rather than invented here — the mark keeps exactly the margin
    somebody gave it. The corners are not rounded and the file carries no alpha
    channel: iOS masks the corners itself, and App Store Connect rejects a
    marketing icon with transparency.
    """
    svg = open(SOURCE, encoding='utf8').read()
    tile = re.search(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"'
                     r'[^>]*rx="\d+"[^>]*fill="(#[0-9A-Fa-f]{6})"', svg)
    if tile is None:
        raise SystemExit('no tile rect in the source: cannot place the icon')

    x0, y0, side = float(tile.group(1)), float(tile.group(2)), float(tile.group(3))
    ground = tuple(int(tile.group(5)[i:i + 2], 16) for i in (1, 3, 5))

    def opaque(path: str, size: int, ink: str, sun: str, ground_rgb):
        scale = size / side
        placed = [brand.transform(subs, scale, -x0 * scale, -y0 * scale)
                  for subs in (letter, rays)]
        rgba = brand.rasterise(
            [(placed[0], ink), (placed[1], sun)], size, ground_rgb, False)

        # RGBA rows to RGB rows: the ground is opaque everywhere, so dropping
        # the channel loses nothing and is what the store asks for.
        rows = bytearray()
        stride = size * 4 + 1
        for y in range(size):
            rows.append(0)
            line = rgba[y * stride + 1:(y + 1) * stride]
            for x in range(size):
                rows += line[x * 4:x * 4 + 3]
        brand.write_png_rgb(os.path.join(ROOT, path), size, bytes(rows))
        print(f'{path} {size}x{size}')

    icons = 'ios/IdeiasOrganizeTask/Images.xcassets/AppIcon.appiconset'
    for name, size in (
        ('AppIcon-20.png', 20), ('AppIcon-20@2x.png', 40),
        ('AppIcon-20@3x.png', 60), ('AppIcon-29.png', 29),
        ('AppIcon-29@2x.png', 58), ('AppIcon-29@3x.png', 87),
        ('AppIcon-40.png', 40), ('AppIcon-40@2x.png', 80),
        ('AppIcon-40@3x.png', 120), ('AppIcon-60@2x.png', 120),
        ('AppIcon-60@3x.png', 180), ('AppIcon-76.png', 76),
        ('AppIcon-76@2x.png', 152), ('AppIcon-83.5@2x.png', 167),
        ('AppIcon-1024.png', 1024), ('AppIcon-1024-dark.png', 1024),
    ):
        opaque(f'{icons}/{name}', size, INK, WHITE, ground)

    # The tinted icon is read as luminance and painted with whatever colour the
    # person picked, so it is drawn in light on dark rather than in brand paint.
    opaque(f'{icons}/AppIcon-1024-tinted.png', 1024, '#FFFFFF', '#FFFFFF',
           (0x1B, 0x17, 0x10))


if __name__ == '__main__':
    main()
