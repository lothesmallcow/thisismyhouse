# Credits

## 3D phone model
- File: `public/models/iphone.glb` (used by `src/scripts/phone3d.ts`).
- Source: "Apple iPhone 15 Pro Max Black" by Polyman,
  https://sketchfab.com/3d-models/apple-iphone-15-pro-max-black-df17520841214c1792fb8a44c6783ee7
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Commercial use allowed with attribution.
  The attribution is in the site footer (Footer.astro): keep it.
- Changes: re-compressed with glTF-Transform (`optimize --compress meshopt --texture-compress webp --texture-size 1024`);
  at runtime the back glass, plateau and frame are recoloured (white titanium), the screen is plain black
  (the live HTML screen sits on top) and the two meshes that draw the maker's logo are hidden (trademark).
- Retrieved from a public GitHub mirror of the original download (adrianhajdin/iphone, public/models/scene.glb),
  because Sketchfab is not reachable from the build environment.
