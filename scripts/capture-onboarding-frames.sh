#!/usr/bin/env bash
#
# Regenerates the first-run walk-through's stills from a real device or
# emulator. The walk-through plays screenshots of the product itself, so
# every PNG in assets/onboarding/ has to come from this script — never from a
# drawing tool.
#
# Requirements: adb (device connected, app installed and signed in), python3
# with Pillow importable (`pip install pillow`). The device should be in
# light theme and pt-BR, with the fixture described in this folder's
# README.md — in particular a shared space named "Churras de sábado" holding
# a couple of open tasks.
#
# Usage:
#   scripts/capture-onboarding-frames.sh couple   # slide 1, 3 frames
#   scripts/capture-onboarding-frames.sh spaces   # slide 2, 3 frames
#   scripts/capture-onboarding-frames.sh invite   # slide 3, 1 still
#   scripts/capture-onboarding-frames.sh all      # all three, in order
#
# Frames land in assets/onboarding/<slide>-NN.png (or step-convite.png for
# the invite still), each a full screenshot with the status bar and the
# system gesture bar cropped away. Every frame this script writes is
# 1080×2250; if that ever needs to change (a different capture device, a
# taller status bar), update CROP_TOP/CROP_BOTTOM below and copy the new
# aspect ratio (1080 / height) into every slide's `aspect` in
# src/app/components/onboarding/onboardingSteps.ts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/onboarding"
mkdir -p "$OUT"

# Measured on a 1080×2400 device: the status bar (clock, battery) ends
# around y=95, and the system gesture bar starts around y=2340. Between them
# is the app, nothing else.
CROP_TOP=90
CROP_BOTTOM=2340

crop() {
  python3 - "$1" "$2" <<PY
from PIL import Image
im = Image.open("$1")
im.crop((0, $CROP_TOP, im.width, $CROP_BOTTOM)).save("$2")
PY
}

tap_id() {
  local point
  point="$(python3 "$ROOT/scripts/adb-tap.py" "$1")"
  # shellcheck disable=SC2086
  adb shell input tap $point
  sleep "${2:-1.5}"
}

tap_xy() {
  adb shell input tap "$1" "$2"
  sleep "${3:-1.5}"
}

type_text() {
  adb shell input text "$1"
  sleep "${2:-1}"
}

hide_keyboard() {
  adb shell input keyevent 4
  sleep 1.2
}

shot() {
  local raw
  raw="$(mktemp)"
  adb exec-out screencap -p > "$raw"
  crop "$raw" "$OUT/$1"
  rm -f "$raw"
}

# Slide 1: the Tasks tab, planning something together — a task typed with a
# date, a priority and a space, and then landing where it was planned.
couple_slide() {
  tap_id tab-today 2
  shot couple-01.png
  tap_id today-capture 2
  hide_keyboard
  tap_id capture-field 1.2
  type_text 'Comprar%sflores%spara%so%sjantar%samanha%s18h%s#casa%s~15min'
  hide_keyboard
  shot couple-02.png
  tap_id capture-save 2.5
  shot couple-03.png
}

# Slide 2: the Spaces tab — the index, a shared space open with its agreement
# band, and the same space after a couple of things get done.
spaces_slide() {
  tap_id tab-lists 2
  shot spaces-01.png
  tap_id list-churras-de-sabado 2
  shot spaces-02.png
  # Checks the first task in "No espaço", not the agreement band's own row
  # (their bounds differ, and the band's checkbox is not a stable id).
  tap_xy 104 908 1.5
  shot spaces-03.png
}

# Slide 3: the invite ready to send. Uses a fresh, throwaway shared space
# instead of an existing one, because the invite sheet on a space that
# already has pending invites and members shows three footer buttons and
# truncates "Cancelar" — the sheet a first-run walk-through should show is
# the simple one right after creating a space.
invite_slide() {
  tap_id tab-lists 2
  tap_id new-list 2
  tap_id list-template-trip 1.5
  # The template pre-fills the name field with the template's own name, so
  # typing appends instead of replacing — clear it first.
  tap_id list-name-field 1
  adb shell input keyevent --longpress KEYCODE_MOVE_END
  for _ in $(seq 1 40); do adb shell input keyevent KEYCODE_DEL; done
  type_text 'Viagem%sde%sjulho'
  hide_keyboard
  tap_id list-shared-toggle 1.5
  tap_id list-name-submit 2.5
  shot step-convite.png
}

case "${1:-all}" in
  couple) couple_slide ;;
  spaces) spaces_slide ;;
  invite) invite_slide ;;
  all) couple_slide; spaces_slide; invite_slide ;;
  *) echo "unknown slide: $1" >&2; exit 1 ;;
esac

echo "frames written to $OUT"
