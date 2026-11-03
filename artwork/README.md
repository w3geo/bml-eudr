# Artwork

Master files for the app icons. The symbols (logs, cow, soy) were traced from the infographic
"EU-Entwaldungsverordnung: Vereinfachte Erklärung" (30.10.2026), at 8x with smoothing and
thickened strokes.

- `logo-glyph.png`: all three symbols, white on transparent
- `logo-16.png`: the logs only, pixeled by hand on the green rounded square, for the 16px favicon
- `logo-512.png`: the icon on the green rounded square, generated

After changing a glyph, run `./build.sh` to regenerate `logo-512.png`, `public/favicon.ico` and
`public/logo.png`. It requires ImageMagick 7.
