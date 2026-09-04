# Store assets

Generated, never hand-edited. Rebuild with:

```
python3 scripts/generate-store-feature-graphic.py
```

## Feature graphic — `feature-graphic-*.png`

Google Play's "Recurso gráfico": PNG or JPEG, exactly **1024 × 500 px**, under
15 MB. Play uses it when the listing is featured, and it is required before a
promo video can be attached.

Drawn to the grammar of direction **3a "Vocês, no estilo Sol"** in the Claude
Design file `Play Store - screenshots.dc.html`: a flat brand ground, the symbol
stacked over the wordmark, one short sentence set tight and heavy beside it.
No rule, no watermark, no gradient.

| File                        | Ground          | Line                                     | Comes from |
| --------------------------- | --------------- | ---------------------------------------- | ---------- |
| `feature-graphic-sol.png`   | Sol `#FFC107`   | Um espaço para a vida que vocês dividem. | 3a, tela 1 |
| `feature-graphic-ink.png`   | Ink `#1D1D1B`   | O dia de vocês, numa tela.               | 3a, tela 2 |
| `feature-graphic-papel.png` | Cream `#F6F3EC` | Quem faz o quê, sem cobrança.            | 1a Papel   |

Symbol and wordmark come straight out of `assets/brand` — scaled, never
redrawn. Everything that has to be read sits inside a 72 × 56 margin, because
Play crops and overlays the outer band on some surfaces (a promo video puts a
play button over the centre).

### Known gaps against the design file

- The wordmark here is the kit trace in `assets/brand`, which is lighter than
  the Bricolage ExtraBold "aluza" the 3a frames set. The design's own smoothed
  symbol (`marca/kit/aluza-symbol-on-sol-smooth.svg`) is not in this repo.
- The headline falls back to a system grotesque; Bricolage Grotesque is not
  installed on the build machine, only its licence is vendored.
