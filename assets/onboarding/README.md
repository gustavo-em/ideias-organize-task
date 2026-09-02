# Onboarding demo frames

The first-run walk-through plays screenshots of this app, not illustrations.
Every PNG here was captured on a device by
`scripts/capture-onboarding-frames.sh` and cropped to the band where the action
happens: 1080×1150 of the screen for both slides, resized to 720px wide. Both
bands stop short of the floating buttons, so no control is shown cut in half.

The PNGs currently in the repository were taken with the previous bands
(1080×1150 from y=1050 for slide 1 and 1080×780 from y=740 for slide 2), which
is why slide 2 does not fill the stage. The next capture uses the bands in the
script; after it, set `aspect` of both demos to `1080 / 1150` in
`onboardingSteps.ts` and copy the new tap coordinates.

- `capture-01..08.png` — slide 1: the Tasks screen, the new task button, the
  sheet, the title being typed and the date/priority/project chips.
- `shared-01..06.png` — slide 2: the Projects screen, the shared project open
  with its agreement band, the invite link and the copied link.
- `capture-taps.json` / `shared-taps.json` — where each step was tapped,
  normalised to the frame. The values are copied into
  `src/app/components/onboarding/onboardingSteps.ts`, which is what the app
  reads to draw the highlight ring. The ring is never burned into the PNG.

## Regenerating

Requirements: `adb` with one device or emulator connected, `ffmpeg`, `python3`.

Prepare the device:

1. light theme, language pt-BR, signed in;
2. profile name `Gustavo`, handle `gustavo` (Você → Editar perfil);
3. tasks in the inbox: `Marcar dentista`, `Pagar o aluguel`,
   `Levar o carro na oficina`;
4. projects `Casa nova` (shared, with an invite link already created) and
   `Viagem de julho`, with `Escolher a cor da sala` and `Comprar as cortinas`
   inside `Casa nova`;
5. no task named `Renovar o seguro` — slide 1 creates it during the capture.

Then, with the app open:

```bash
scripts/capture-onboarding-frames.sh capture
scripts/capture-onboarding-frames.sh shared
```

Each run rewrites the PNGs and the `*-taps.json` of that slide. When a tap moves
to a different place, copy the new coordinates from the JSON into
`onboardingSteps.ts`.

Two adjustments are made by hand after copying, and both are on purpose:

- a coordinate that lands on the label of a wide button is nudged onto its icon
  or onto its empty side, so the ring never sits on top of the words;
- a coordinate outside the cropped band (a button that the crop leaves out) is
  dropped: that frame simply has no ring.
