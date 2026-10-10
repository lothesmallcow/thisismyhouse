# Font build notes

- `public/fonts/archivo-latin.woff2`: Archivo variable (wght 100-900, wdth 62-125) from
  `@fontsource-variable/archivo` (latin, "standard" axes), subset with pyftsubset to the
  characters Italian copy needs (Basic Latin, Latin-1, curly quotes, ellipsis, euro).
- `public/fonts/literata-latin.woff2`: Literata variable limited to wght 400-700 with the
  fontTools instancer, then subset the same way.
- `*-latin-ext.woff2`: unmodified Fontsource files, loaded only if a page uses those characters.
- `*.ttf` here: static instances used at build time for the logo paths and social images.

Recreate (needs `pip install fonttools brotli`):

    pyftsubset IN.woff2 --unicodes="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+2018-201E,U+2022,U+2026,U+20AC,U+2122" \
      --layout-features="kern,liga,calt,ccmp,locl,mark,mkmk" --flavor=woff2 --output-file=OUT.woff2
