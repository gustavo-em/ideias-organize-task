#!/usr/bin/env python3
"""Renders the Play Store feature graphic (1024x500) from the brand kit.

Drawn to the same grammar as direction 3a of the Claude Design file
`Play Store - screenshots.dc.html`: a flat brand ground, the symbol stacked
over the wordmark, and one short sentence set tight and heavy beside it. No
rule, no watermark, no gradient — the store card is the poster the screenshots
already are.

The artwork is never redrawn: symbol and wordmark come straight from
`assets/brand`, base64'd into a page that Chrome renders at exactly the size
the store asks for. Three grounds, one per brand surface.

    python3 scripts/generate-store-feature-graphic.py
"""
import base64
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = ROOT / 'assets' / 'brand'
OUT = ROOT / 'assets' / 'store'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

INK = '#1D1D1B'
SUN = '#FFC107'
CREAM = '#F6F3EC'
WHITE = '#FFFFFF'

# Play crops and overlays the outer band on some surfaces, so nothing that has
# to be read lives outside this box.
SAFE_X = 72
SAFE_Y = 56


def data_uri(name: str) -> str:
    raw = (BRAND / name).read_bytes()
    return 'data:image/png;base64,' + base64.b64encode(raw).decode('ascii')


VARIANTS = [
    # 3a "Vocês, no estilo Sol": ink on the brand yellow, rays in white.
    {
        'slug': 'feature-graphic-sol',
        'bg': SUN,
        'symbol': 'aluza-symbol-yellow-bg.png',
        'wordmark': 'aluza-wordmark.png',
        'headline': 'Um espaço para a vida<br>que vocês dividem.',
        'fg': INK,
    },
    # The ink frame the same direction alternates into, screen 2.
    {
        'slug': 'feature-graphic-ink',
        'bg': INK,
        'symbol': 'aluza-symbol-dark-bg.png',
        'wordmark': 'aluza-wordmark-dark.png',
        'headline': 'O dia de vocês,<br>numa tela.',
        'fg': CREAM,
    },
    # 1a "Papel": the quiet ground, for a listing that lets the app speak.
    {
        'slug': 'feature-graphic-papel',
        'bg': CREAM,
        'symbol': 'aluza-symbol-primary.png',
        'wordmark': 'aluza-wordmark.png',
        'headline': 'Quem faz o quê,<br>sem cobrança.',
        'fg': INK,
    },
]
PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ width: 1024px; height: 500px; overflow: hidden; }}
  body {{
    background: {bg};
    font-family: 'Bricolage Grotesque', 'Archivo', 'Avenir Next',
      'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }}
  /* Everything that has to be read lives inside this box: Play crops and
     overlays the outer band on some surfaces, and a promo video puts a play
     button over the middle. */
  .sheet {{
    width: 1024px;
    height: 500px;
    padding: {safe_y}px {safe_x}px;
    display: flex;
    align-items: center;
    gap: 64px;
  }}
  /* The vertical lockup of the hero frame: symbol over wordmark, both cut
     from the kit and only ever scaled. */
  .lockup {{
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }}
  .symbol {{ width: 148px; }}
  .wordmark {{ width: 176px; }}
  .headline {{
    flex: 1 1 auto;
    font-size: 56px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -1.8px;
    color: {fg};
  }}
</style></head>
<body><div class="sheet">
  <div class="lockup">
    <img class="symbol" src="{symbol}">
    <img class="wordmark" src="{wordmark}">
  </div>
  <div class="headline">{headline}</div>
</div></body></html>
"""
def render(variant: dict) -> pathlib.Path:
    html = PAGE.format(
        bg=variant['bg'],
        symbol=data_uri(variant['symbol']),
        wordmark=data_uri(variant['wordmark']),
        headline=variant['headline'],
        fg=variant['fg'],
        safe_x=SAFE_X,
        safe_y=SAFE_Y,
    )
    out = OUT / f"{variant['slug']}.png"
    with tempfile.TemporaryDirectory() as tmp:
        page = pathlib.Path(tmp) / 'page.html'
        page.write_text(html, encoding='utf-8')
        subprocess.run(
            [
                CHROME,
                '--headless',
                '--disable-gpu',
                '--hide-scrollbars',
                '--force-device-scale-factor=1',
                f'--screenshot={out}',
                '--window-size=1024,500',
                str(page),
            ],
            check=True,
            capture_output=True,
        )

    return out


def main() -> int:
    if not pathlib.Path(CHROME).exists():
        print(f'Chrome not found at {CHROME}', file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    for variant in VARIANTS:
        path = render(variant)
        print(f'{path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} KB')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
