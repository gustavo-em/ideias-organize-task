#!/usr/bin/env python3
"""Turning path geometry into pictures: rasteriser, PNG writers, path maths.

This was the whole brand pipeline while the mark lived as an auto-traced kit
that had to be smoothed before it could be drawn. That kit is gone and so is
the pipeline; what was worth keeping is the machinery below, which
`generate-aluza-mark.py` uses to draw the current source.

Nothing here knows what the mark looks like. Keep it that way.
"""

from __future__ import annotations

import math
import os
import re
import struct
import subprocess
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

# --- Smoothing budget, in units of the kit drawing (~872 units wide) --------
# The trace grid is 4 units, so a step deviates about 2 units from the line it
# approximates. Anything past 4 units would be a redrawing, not a cleanup.
# 1.8 is the coarsest simplification that still keeps every contour inside the
# deviation budget below; anything looser starts cutting real detail out of the
# thin sun strokes.
RDP_EPSILON = 1.8
CORNER_DEGREES = 40.0
PERP_LIMIT = 2.0
MAX_DEVIATION = 4.0
MAX_AREA_DRIFT = 0.01
MAX_RATIO_DRIFT = 0.005


# ---------------------------------------------------------------------------
# Geometry model
#
# A subpath is (start_point, [segment...]) where a segment is either
#   ('L', end) or ('C', control1, control2, end)
# and the subpath is always closed back onto its start point.
# ---------------------------------------------------------------------------


def read_paths(name: str) -> list[tuple[str, str]]:
    if not name.endswith('.svg'):
        raise SystemExit(f'{name} is not a vector source')
    source = open(os.path.join(ROOT, 'assets/brand', name), encoding='utf8').read()
    found = re.findall(r'<path d="([^"]+)"[^>]*fill="([^"]+)"', source)
    if not found:
        raise SystemExit(f'no path found in {name}')
    return [(d.strip(), fill.upper()) for d, fill in found]


def polygons_of(d: str) -> list[list[tuple[float, float]]]:
    """The kit paths are traced polygons: M/L/Z only, absolute."""
    if re.search(r'[cCqQsStTaAhHvVmlz]', d.replace('M', '').replace('L', '').replace('Z', '')):
        raise SystemExit('kit path uses commands this generator does not model')
    out: list[list[tuple[float, float]]] = []
    for part in d.split('M'):
        part = part.strip()
        if not part:
            continue
        numbers = [float(value) for value in re.findall(r'-?\d+(?:\.\d+)?', part)]
        points = list(zip(numbers[0::2], numbers[1::2]))
        while len(points) > 1 and points[0] == points[-1]:
            points.pop()
        if len(points) >= 3:
            out.append(points)
    return out


def subpath_points(sub) -> list[tuple[float, float]]:
    """Every point of a subpath, control points included."""
    start, segments = sub
    points = [start]
    for segment in segments:
        points.extend(segment[1:])
    return points


def bbox(subs) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for sub in subs:
        for x, y in flatten_subpath(sub, 0.05):
            xs.append(x)
            ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def transform(subs, scale: float, dx: float, dy: float):
    def move(point):
        return (point[0] * scale + dx, point[1] * scale + dy)

    out = []
    for start, segments in subs:
        out.append((move(start), [(seg[0],) + tuple(move(p) for p in seg[1:])
                                  for seg in segments]))
    return out


def path_data(subs) -> str:
    parts: list[str] = []
    for start, segments in subs:
        chunk = [f'M{start[0]:.2f},{start[1]:.2f}']
        for segment in segments:
            if segment[0] == 'L':
                chunk.append(f'L{segment[1][0]:.2f},{segment[1][1]:.2f}')
            else:
                (c1x, c1y), (c2x, c2y), (ex, ey) = segment[1:]
                chunk.append(
                    f'C{c1x:.2f},{c1y:.2f} {c2x:.2f},{c2y:.2f} {ex:.2f},{ey:.2f}'
                )
        chunk.append('Z')
        parts.append(' '.join(chunk))
    return ' '.join(parts)


def normalise(subs, box, size: float, share: float):
    """Uniform scale into `size`, keeping the kit proportion, then centre."""
    min_x, min_y, max_x, max_y = box
    width = max_x - min_x
    height = max_y - min_y
    scale = (size * share) / max(width, height)
    dx = (size - width * scale) / 2 - min_x * scale
    dy = (size - height * scale) / 2 - min_y * scale
    return transform(subs, scale, dx, dy)


# ---------------------------------------------------------------------------
# Curve maths
# ---------------------------------------------------------------------------


def cubic_at(p0, c1, c2, p3, t: float) -> tuple[float, float]:
    u = 1 - t
    a, b, c, d = u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t
    return (a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
            a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1])


def cubic_steps(p0, c1, c2, p3, tolerance: float) -> int:
    hull = (math.dist(p0, c1) + math.dist(c1, c2) + math.dist(c2, p3))
    if hull <= 0:
        return 1
    return max(2, min(64, int(math.ceil(math.sqrt(hull / max(tolerance, 1e-6))))))


def flatten_subpath(sub, tolerance: float) -> list[tuple[float, float]]:
    start, segments = sub
    points = [start]
    current = start
    for segment in segments:
        if segment[0] == 'L':
            points.append(segment[1])
            current = segment[1]
        else:
            c1, c2, end = segment[1:]
            steps = cubic_steps(current, c1, c2, end, tolerance)
            for index in range(1, steps + 1):
                points.append(cubic_at(current, c1, c2, end, index / steps))
            current = end
    while len(points) > 1 and points[0] == points[-1]:
        points.pop()
    return points


def polygon_area(points: list[tuple[float, float]]) -> float:
    total = 0.0
    for index in range(len(points)):
        ax, ay = points[index]
        bx, by = points[(index + 1) % len(points)]
        total += ax * by - bx * ay
    return abs(total) / 2


def polygon_length(points: list[tuple[float, float]]) -> float:
    total = 0.0
    for index in range(len(points)):
        total += math.dist(points[index], points[(index + 1) % len(points)])
    return total


def point_to_segment(point, a, b) -> float:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    span = dx * dx + dy * dy
    if span == 0:
        return math.dist(point, a)
    t = max(0.0, min(1.0, ((point[0] - ax) * dx + (point[1] - ay) * dy) / span))
    return math.dist(point, (ax + t * dx, ay + t * dy))


def max_gap(points, reference) -> float:
    """Worst distance from every point to the reference closed polyline.

    Both inputs are dense, so a nearest-vertex search plus its two neighbouring
    segments is exact enough for a tolerance check of a few units.
    """
    worst = 0.0
    count = len(reference)
    for point in points:
        nearest = min(range(count), key=lambda i: math.dist(point, reference[i]))
        best = min(
            point_to_segment(point, reference[(nearest - 1) % count], reference[nearest]),
            point_to_segment(point, reference[nearest], reference[(nearest + 1) % count]),
        )
        worst = max(worst, best)
    return worst


# ---------------------------------------------------------------------------
# Smoothing: take the tracing staircase out, keep the drawing
# ---------------------------------------------------------------------------


def rdp(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return list(points)
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        worst = 0.0
        index = -1
        for i in range(first + 1, last):
            distance = point_to_segment(points[i], points[first], points[last])
            if distance > worst:
                worst = distance
                index = i
        if index != -1 and worst > epsilon:
            keep[index] = True
            stack.append((first, index))
            stack.append((index, last))
    return [point for point, kept in zip(points, keep) if kept]


def simplify_closed(points, epsilon: float) -> list[tuple[float, float]]:
    """RDP on a closed ring, anchored on its farthest point from the centre so
    the result does not depend on where the trace happened to start."""
    cx = sum(x for x, _ in points) / len(points)
    cy = sum(y for _, y in points) / len(points)
    anchor = max(range(len(points)), key=lambda i: math.dist(points[i], (cx, cy)))
    rotated = points[anchor:] + points[:anchor]
    reduced = rdp(rotated + [rotated[0]], epsilon)
    while len(reduced) > 1 and reduced[0] == reduced[-1]:
        reduced.pop()
    return reduced


def is_corner(previous, point, following, threshold_cos: float) -> bool:
    ax, ay = point[0] - previous[0], point[1] - previous[1]
    bx, by = following[0] - point[0], following[1] - point[1]
    la = math.hypot(ax, ay)
    lb = math.hypot(bx, by)
    if la == 0 or lb == 0:
        return True
    # `cosine` compares the two directions: 1 means the outline keeps going
    # straight, and it falls as the outline turns.
    cosine = (ax * bx + ay * by) / (la * lb)
    return cosine < threshold_cos


def smooth_polygon(points: list[tuple[float, float]]):
    """A traced ring becomes a curve: corners stay corners, the staircase in
    between becomes one Catmull-Rom span per edge."""
    ring = simplify_closed(points, RDP_EPSILON)
    count = len(ring)
    if count < 3:
        return (ring[0], [('L', ring[i]) for i in range(1, count)])

    threshold_cos = math.cos(math.radians(CORNER_DEGREES))
    corner = [
        is_corner(ring[(i - 1) % count], ring[i], ring[(i + 1) % count], threshold_cos)
        for i in range(count)
    ]

    segments = []
    for i in range(count):
        p0 = ring[(i - 1) % count]
        p1 = ring[i]
        p2 = ring[(i + 1) % count]
        p3 = ring[(i + 2) % count]
        if corner[i] and corner[(i + 1) % count]:
            segments.append(('L', p2))
            continue
        span = math.dist(p1, p2)
        if corner[i]:
            t1 = (0.0, 0.0)
        else:
            t1 = ((p2[0] - p0[0]) / 6, (p2[1] - p0[1]) / 6)
        if corner[(i + 1) % count]:
            t2 = (0.0, 0.0)
        else:
            t2 = ((p3[0] - p1[0]) / 6, (p3[1] - p1[1]) / 6)
        # Handles are kept short, and their sideways part shorter still: that
        # is what keeps the curve inside the traced silhouette instead of
        # bowing a long edge out of it.
        limit = span / 3 if span > 0 else 0.0
        chord = ((p2[0] - p1[0]) / span, (p2[1] - p1[1]) / span) if span else (0.0, 0.0)
        t1 = clamp_handle(flatten_handle(t1, chord), limit)
        t2 = clamp_handle(flatten_handle(t2, chord), limit)
        c1 = (p1[0] + t1[0], p1[1] + t1[1])
        c2 = (p2[0] - t2[0], p2[1] - t2[1])
        segments.append(('C', c1, c2, p2))
    return (ring[0], segments)


def flatten_handle(handle, chord):
    """Keep the handle's sideways reach inside `PERP_LIMIT`: a cubic sits at
    most three quarters of that away from its chord, so the curve can never
    wander off the traced edge."""
    if chord == (0.0, 0.0):
        return handle
    along = handle[0] * chord[0] + handle[1] * chord[1]
    px = handle[0] - along * chord[0]
    py = handle[1] - along * chord[1]
    length = math.hypot(px, py)
    if length > PERP_LIMIT:
        factor = PERP_LIMIT / length
        px, py = px * factor, py * factor
    return (along * chord[0] + px, along * chord[1] + py)


def clamp_handle(handle, limit: float):
    length = math.hypot(handle[0], handle[1])
    if length <= limit or length == 0:
        return handle
    factor = limit / length
    return (handle[0] * factor, handle[1] * factor)


def tighten(sub, traced):
    """Any single curve that strays off the traced outline goes back to being
    a straight edge. Smoothing is allowed to remove the tracing grid, never to
    invent a shape the kit does not have."""
    start, segments = sub
    current = start
    fixed = []
    for segment in segments:
        if segment[0] == 'L':
            fixed.append(segment)
            current = segment[1]
            continue
        c1, c2, end = segment[1:]
        samples = [cubic_at(current, c1, c2, end, index / 8) for index in range(1, 8)]
        if max_gap(samples, traced) > MAX_DEVIATION:
            fixed.append(('L', end))
        else:
            fixed.append(segment)
        current = end
    return (start, fixed)


def smooth(polygons, label: str):
    """Smooth every ring of a path and assert the drawing survived."""
    subs = []
    worst_deviation = 0.0
    traced_area = 0.0
    smooth_area = 0.0
    for points in polygons:
        sub = tighten(smooth_polygon(points), points)
        dense = flatten_subpath(sub, 0.05)
        deviation = max(max_gap(dense, points), max_gap(points, dense))
        worst_deviation = max(worst_deviation, deviation)
        traced_area += polygon_area(points)
        smooth_area += polygon_area(dense)
        subs.append(sub)

    if worst_deviation > MAX_DEVIATION:
        raise SystemExit(
            f'{label}: smoothing moved the outline {worst_deviation:.2f} units, '
            f'past the {MAX_DEVIATION} unit budget'
        )
    drift = abs(smooth_area - traced_area) / traced_area
    if drift > MAX_AREA_DRIFT:
        raise SystemExit(
            f'{label}: smoothing changed the filled area by {drift * 100:.2f}%, '
            f'past {MAX_AREA_DRIFT * 100:.0f}%'
        )
    print(f'{label}: {len(subs)} contours, deviation {worst_deviation:.2f} units, '
          f'area drift {drift * 100:.2f}%')
    return subs, worst_deviation


# ---------------------------------------------------------------------------
# Rasteriser: scanline with an active edge table, 16 sub-scanlines per pixel
# and exact fractional horizontal coverage. Nothing is ever resampled from a
# bitmap: the geometry is rasterised straight at the target size.
# ---------------------------------------------------------------------------

SUB_ROWS = 16
FLATTEN_TOLERANCE = 0.25


def coverage_of(subs, size: int) -> list[float]:
    """Even-odd coverage of a path, one float per pixel, 0..1."""
    edges_by_row: dict[int, list[tuple[float, float, float, float]]] = {}
    for sub in subs:
        points = flatten_subpath(sub, FLATTEN_TOLERANCE)
        count = len(points)
        for index in range(count):
            ax, ay = points[index]
            bx, by = points[(index + 1) % count]
            if ay == by:
                continue
            top = min(ay, by)
            bottom = max(ay, by)
            first = max(0, int(math.floor(top * SUB_ROWS)))
            last = min(size * SUB_ROWS - 1, int(math.ceil(bottom * SUB_ROWS)))
            for row in range(first, last + 1):
                edges_by_row.setdefault(row, []).append((ax, ay, bx, by))

    coverage = [0.0] * (size * size)
    share = 1.0 / SUB_ROWS
    for row, edges in edges_by_row.items():
        sample_y = (row + 0.5) / SUB_ROWS
        crossings = []
        for ax, ay, bx, by in edges:
            if (ay <= sample_y < by) or (by <= sample_y < ay):
                crossings.append(ax + (sample_y - ay) * (bx - ax) / (by - ay))
        if len(crossings) < 2:
            continue
        crossings.sort()
        base = (row // SUB_ROWS) * size
        for index in range(0, len(crossings) - 1, 2):
            add_span(coverage, base, size, crossings[index],
                     crossings[index + 1], share)
    return [min(1.0, value) for value in coverage]


def add_span(coverage, base: int, size: int, x0: float, x1: float, share: float) -> None:
    x0 = max(0.0, x0)
    x1 = min(float(size), x1)
    if x1 <= x0:
        return
    first = int(math.floor(x0))
    last = int(math.ceil(x1)) - 1
    for x in range(first, min(last, size - 1) + 1):
        left = max(x0, float(x))
        right = min(x1, float(x + 1))
        if right > left:
            coverage[base + x] += (right - left) * share


def circle_coverage(size: int) -> list[float]:
    coverage = [0.0] * (size * size)
    share = 1.0 / SUB_ROWS
    radius = size / 2
    for row in range(size * SUB_ROWS):
        sample_y = (row + 0.5) / SUB_ROWS
        dy = sample_y - radius
        if abs(dy) >= radius:
            continue
        half = math.sqrt(radius * radius - dy * dy)
        base = (row // SUB_ROWS) * size
        add_span(coverage, base, size, radius - half, radius + half, share)
    return [min(1.0, value) for value in coverage]


def rasterise(layers, size: int, background, circle_mask: bool) -> bytes:
    """`layers` is [(subpaths, '#RRGGBB')], painted in order.

    `background` is an (r, g, b) ground, or None for a transparent one: an
    image drawn over a colour somebody else owns must not carry its own copy
    of that colour, or the two go out of step the day one of them changes.
    """
    mask = circle_coverage(size) if circle_mask else None
    base_rgb = (0, 0, 0) if background is None else background[:3]
    if background is None:
        base_alpha = [0.0] * (size * size)
    else:
        base_alpha = [1.0] * (size * size) if mask is None else mask

    red = [base_rgb[0] / 255 * a for a in base_alpha]
    green = [base_rgb[1] / 255 * a for a in base_alpha]
    blue = [base_rgb[2] / 255 * a for a in base_alpha]
    alpha = list(base_alpha)

    for subs, colour in layers:
        rgb = (int(colour[1:3], 16) / 255, int(colour[3:5], 16) / 255,
               int(colour[5:7], 16) / 255)
        cover = coverage_of(subs, size)
        for index, a in enumerate(cover):
            if a <= 0:
                continue
            if mask is not None:
                a *= mask[index]
                if a <= 0:
                    continue
            keep = 1 - a
            red[index] = rgb[0] * a + red[index] * keep
            green[index] = rgb[1] * a + green[index] * keep
            blue[index] = rgb[2] * a + blue[index] * keep
            alpha[index] = a + alpha[index] * keep

    out = bytearray()
    for y in range(size):
        out.append(0)
        row = y * size
        for x in range(size):
            index = row + x
            a = alpha[index]
            if a <= 0:
                out += bytes((0, 0, 0, 0))
                continue
            out += bytes((
                round(min(1.0, red[index] / a) * 255),
                round(min(1.0, green[index] / a) * 255),
                round(min(1.0, blue[index] / a) * 255),
                round(a * 255),
            ))
    return bytes(out)


def write_png(path: str, size: int, raw: bytes) -> None:
    expected = size * (size * 4 + 1)
    if len(raw) != expected:
        raise SystemExit(f'{path}: {len(raw)} bytes for a {size}x{size} image, '
                         f'expected {expected}')

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (struct.pack('>I', len(payload)) + tag + payload
                + struct.pack('>I', zlib.crc32(tag + payload) & 0xFFFFFFFF))

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    data = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)

    written = open(path, 'rb').read(24)
    width, height = struct.unpack('>II', written[16:24])
    if (width, height) != (size, size):
        raise SystemExit(f'{path}: wrote {width}x{height}, expected {size}x{size}')


def write_png_rgb(path: str, size: int, raw: bytes) -> None:
    """A PNG with no alpha channel, for the one image the store refuses to take
    with one: the marketing icon."""
    expected = size * (size * 3 + 1)
    if len(raw) != expected:
        raise SystemExit(f'{path}: {len(raw)} bytes for a {size}x{size} image, '
                         f'expected {expected}')

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (struct.pack('>I', len(payload)) + tag + payload
                + struct.pack('>I', zlib.crc32(tag + payload) & 0xFFFFFFFF))

    header = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header)
                           + chunk(b'IDAT', zlib.compress(raw, 9))
                           + chunk(b'IEND', b''))


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


def squared(box):
    """The kit symbol is drawn square. Padding the tight box back to a square
    keeps it that way at every size: blank is added, the drawing is not."""
    min_x, min_y, max_x, max_y = box
    width = max_x - min_x
    height = max_y - min_y
    side = max(width, height)
    return (min_x - (side - width) / 2, min_y - (side - height) / 2,
            min_x - (side - width) / 2 + side, min_y - (side - height) / 2 + side)


def ratio_of(box) -> float:
    return (box[2] - box[0]) / (box[3] - box[1])
