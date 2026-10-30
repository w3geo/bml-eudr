# Artwork

Master files for the app icons. The symbols (cow, logs, soy) were traced from
`public/EU_Entwaldungsverordnung_Grafik_Einmeldung.png`, which was removed in d38f839
(`git show d38f839^:public/EU_Entwaldungsverordnung_Grafik_Einmeldung.png`).

- `logo-glyph.png`: all three symbols, white on transparent
- `logo-glyph-cow.png`: the cow only, white on transparent, for the 16px favicon
- `logo-512.png`: the icon on the green rounded square, generated

After changing a glyph, run `./build.sh` to regenerate `logo-512.png`, `public/favicon.ico` and
`public/logo.png`. It requires ImageMagick 7.
