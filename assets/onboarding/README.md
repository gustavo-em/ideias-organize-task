# Onboarding demo stills

The first-run walk-through plays screenshots of this app, not illustrations.
Every PNG here was captured on a device by
`scripts/capture-onboarding-frames.sh`: a full screenshot with the status bar
and the system gesture bar cropped away, 1080×2250. `SlideShow` crossfades
between a slide's own frames — no ring, no highlight, no cropped band — so a
still only has to be a real, legible screen of the app.

- `couple-01..03.png` — slide 1, "A vida a dois, combinada": the Tasks tab,
  a task typed with a date/priority/space and then landing where it was
  planned.
- `spaces-01..03.png` — slide 2, "Um espaço para cada plano": the Spaces
  tab's index, the shared space "Churras de sábado" open with its agreement
  band, then the same space with a couple of things done.
- `step-convite.png` — slide 3, "Convide quem divide a rotina": the invite
  sheet, link ready to copy or send.
- `capture-*.png`, `shared-*.png`, `*-taps.json` — leftovers from an earlier
  version of this script that cropped a band of the screen and drew a
  highlight ring per tap. Nothing in the app reads them any more; kept only
  because deleting them isn't this change's job.

## Regenerating

Requirements: `adb` with one device or emulator connected, `python3` with
Pillow installed (`pip install pillow`).

Prepare the device:

1. light theme, language pt-BR, signed in;
2. a shared space named `Churras de sábado` with at least two open tasks in
   it (the walk-through's second slide opens this space by name);
3. no space named `Viagem de julho` — the invite slide creates one during
   the capture, as a throwaway shared space, and leaves it in place;
4. no task named `Comprar flores para o jantar` — the first slide creates it
   during the capture.

Then, with the app open on its Tasks tab:

```bash
scripts/capture-onboarding-frames.sh all
```

Or capture one slide at a time with `couple`, `spaces`, or `invite` instead
of `all`. Each run rewrites only the PNGs of that slide.

If the capture device's status bar or gesture bar has a different height than
the one this script was tuned on (1080×2400, gesture navigation), the crop
will clip the app or leave a sliver of system UI in frame — adjust
`CROP_TOP`/`CROP_BOTTOM` at the top of the script and copy the new aspect
ratio (`1080 / (CROP_BOTTOM - CROP_TOP)`) into every slide's `aspect` in
`src/app/components/onboarding/onboardingSteps.ts`.
