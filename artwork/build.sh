#!/bin/sh
# Builds the app icons from the white-on-transparent glyphs in this folder:
# logo-512.png (master icon), ../public/favicon.ico and ../public/logo.png (app bar logo).
# Requires ImageMagick 7 (magick).
set -e
cd "$(dirname "$0")"

# Glyph centered on the green rounded square
tile() {
  magick -size 512x512 xc:none -fill '#2E7D32' -draw 'roundrectangle 0,0 511,511 100,100' \
    \( "$1" -resize "$2x$2" \) -gravity center -composite "$3"
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

tile logo-glyph.png 440 logo-512.png
# At 16px the three symbols are unreadable, so that size shows the cow only
tile logo-glyph-cow.png 450 "$tmp/cow-512.png"
magick "$tmp/cow-512.png" -resize 16x16 "$tmp/16.png"
magick logo-512.png -resize 32x32 "$tmp/32.png"
magick logo-512.png -resize 48x48 "$tmp/48.png"
magick "$tmp/16.png" "$tmp/32.png" "$tmp/48.png" ../public/favicon.ico

magick logo-glyph.png -resize 192x192 -trim +repage -strip ../public/logo.png
