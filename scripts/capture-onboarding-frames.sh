#!/usr/bin/env bash
#
# Regenerates the onboarding demo frames from a real device or emulator.
#
# The onboarding plays screenshots of the product itself, so every frame in
# assets/onboarding/ has to come from this script — never from a drawing tool.
#
# Requirements: adb (device connected, app installed and open), ffmpeg, python3.
# The device must be in light theme, in pt-BR, signed in, with the sample data
# described in assets/onboarding/README.md.
#
# Usage:
#   scripts/capture-onboarding-frames.sh capture   # slide 1, 8 frames
#   scripts/capture-onboarding-frames.sh shared    # slide 2, 6 frames
#
# Frames land in assets/onboarding/<slide>-NN.png, cropped to the action band
# and resized to 720px wide. The tap coordinates of every step are written to
# <slide>-taps.json, normalised to the cropped frame, so the app can draw the
# highlight ring over the button that was pressed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/onboarding"
RAW="$(mktemp -d)"
SLIDE="${1:-capture}"
mkdir -p "$OUT"

# The band that carries the action: the list rows, the capture sheet and the
# buttons at the bottom. Keeping one band for every frame is what lets the
# crossfade read as one screen instead of a slideshow.
CROP_X=0
CROP_W=1080
# Slide 1 lives at the bottom of the screen (list rows, sheet, save button);
# slide 2 needs the project rows and the agreement band a bit higher up, and
# stops above the floating buttons so none of them is cut in half.
if [ "$SLIDE" = "shared" ]; then
  # Same height as slide 1, so both demos fill the stage instead of sitting
  # letterboxed inside it, and still ending above the floating buttons.
  CROP_Y=660
  CROP_H=1150
else
  # Starts above the chip row of the project picker and below the
  # writing-shortcuts button, so neither is shown sliced, and ends below the
  # save button.
  CROP_Y=1010
  CROP_H=1150
fi

TAPS="$OUT/$SLIDE-taps.json"
LAST_SHOT=0
: > "$TAPS.tmp"

shot() {
  LAST_SHOT="$1"
  local n
  n="$(printf '%02d' "$1")"
  adb exec-out screencap -p > "$RAW/$SLIDE-$n.png"
  ffmpeg -y -loglevel error -i "$RAW/$SLIDE-$n.png" \
    -vf "crop=$CROP_W:$CROP_H:$CROP_X:$CROP_Y,scale=720:-1" \
    "$OUT/$SLIDE-$n.png"
  sleep 0.4
}

# Taps the element and records where it was, so the frame already captured gets
# its highlight ring on the button the user is meant to press.
tap_id() {
  local point x y
  point="$(python3 "$ROOT/scripts/adb-tap.py" "$1")"
  x="${point% *}"
  y="${point#* }"
  echo "$LAST_SHOT $x $y" >> "$TAPS.tmp"
  adb shell input tap "$x" "$y"
  sleep "${2:-1.4}"
}

# Records a ring over an element without pressing it: used when the real tap
# would leave the app (the system share chooser, for instance).
mark() {
  local point x y
  point="$(python3 "$ROOT/scripts/adb-tap.py" "$1")"
  x="${point% *}"
  y="${point#* }"
  echo "$LAST_SHOT $x $y" >> "$TAPS.tmp"
}

# A tap that only moves the flow along and does not deserve a ring.
tap_quiet() {
  local point
  point="$(python3 "$ROOT/scripts/adb-tap.py" "$1")"
  # shellcheck disable=SC2086
  adb shell input tap $point
  sleep "${2:-1.4}"
}

# Taps raw screen coordinates: used where two nodes answer to the same label,
# like the sheet's Cancel button and the scrim behind it.
tap_xy() {
  adb shell input tap "$1" "$2"
  sleep "${3:-1.4}"
}

type_text() {
  adb shell input text "$1"
  sleep "${2:-1}"
}

hide_keyboard() {
  adb shell input keyevent 4
  sleep 1.2
}

capture_slide() {
  # 1. the real Tasks screen, before the tap on the new task button
  tap_quiet tab-today 1.6
  shot 1
  tap_id today-capture 1.8
  hide_keyboard
  # 2. the sheet open, waiting for the title
  shot 2
  tap_id capture-field 1.2
  # 3. the title being typed
  type_text 'Renovar%so'
  hide_keyboard
  shot 3
  tap_quiet capture-field 1.2
  type_text '%sseguro'
  hide_keyboard
  # 4. the title finished, before opening the chips
  shot 4
  tap_id capture-more 1.6
  # 5. the three chips: date, priority, project
  shot 5
  tap_id capture-chip-date 1.6
  # 6. the date panel
  shot 6
  tap_id calendar-tomorrow 1.4
  tap_quiet capture-chip-priority 1.2
  tap_quiet capture-chip-priority 1.2
  tap_quiet capture-chip-list 1.6
  # 7. the project picker, with the date and priority already set
  shot 7
  tap_id list-option-casa-nova 1.4
  tap_quiet capture-save 2.2
  # 8. the task in the list
  shot 8
}

shared_slide() {
  # A sheet left open from a previous run would shift every frame, so the
  # capture always starts from the plain Projects screen.
  adb shell monkey -p com.ideiasorganizetask -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 5
  tap_quiet tab-lists 1.6
  # The project starts closed: the first frame has to show the list as anyone
  # opening the app would find it.
  if python3 "$ROOT/scripts/adb-tap.py" shared-day-band >/dev/null 2>&1; then
    tap_quiet list-chevron-casa-nova 1.6
  fi
  # 1. the real Projects screen, before opening the shared project
  shot 1
  tap_id list-chevron-casa-nova 1.8
  # 2. the shared project open: the agreement band and the tasks
  shot 2
  tap_id list-share-inline 2
  # 3. the invite sheet: the link and what whoever joins can do
  shot 3
  tap_id share-copy-link 0.7
  # 4. the link copied, ready to send to the other person
  shot 4
  tap_xy 658 2130 1.8
  # 5. back on the project, on the agreement band
  shot 5
  tap_quiet list-chevron-casa-nova 1.8
  # 6. the list again, with the shared project closed
  shot 6
}

case "$SLIDE" in
  capture) capture_slide ;;
  shared) shared_slide ;;
  *) echo "unknown slide: $SLIDE" >&2; exit 1 ;;
esac

python3 - "$TAPS.tmp" "$TAPS" "$CROP_X" "$CROP_Y" "$CROP_W" "$CROP_H" <<'PY'
import json, sys
src, dst, cx, cy, cw, ch = sys.argv[1:7]
cx, cy, cw, ch = map(int, (cx, cy, cw, ch))
taps = {}
for line in open(src):
    frame, x, y = map(int, line.split())
    taps[str(frame)] = {
        'x': round((x - cx) / cw, 4),
        'y': round((y - cy) / ch, 4),
    }
json.dump(taps, open(dst, 'w'), indent=2, sort_keys=True)
open(dst, 'a').write('\n')
PY
rm -f "$TAPS.tmp"

echo "frames written to $OUT"
