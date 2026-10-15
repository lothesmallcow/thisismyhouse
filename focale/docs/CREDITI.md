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

## 3D laptop model
- File: `public/models/macbook.glb` (used by `src/scripts/phone3d.ts`, laptop of the makeover film).
- Source: "MacBook Pro M3 16 inch 2024" by jackbaeten,
  https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), stated in the file's own `asset.extras`
  and in the mirror's CREDITS.md. Commercial use allowed with attribution; the attribution is in the site
  footer (Footer.astro): keep it. Worth confirming once on the Sketchfab page (not reachable from the build environment).
- Rig: the file is `assets/macbook-rigged.glb` of https://github.com/william-laverty/rigged-macbook-3d (code MIT,
  model CC BY 4.0, modified by William Laverty: recoloured Space Black, lid split at the hinge under a `LidPivot`
  node, meshopt compression). Downloaded unchanged from raw.githubusercontent.com (main branch, October 2026).
- Our changes, at runtime: the dark aluminium back to silver, the screen plain black (the live HTML screen sits on
  top), and the faces of `LidMesh` turned backwards removed: they draw the maker's logo on the lid (trademark).
  "MacBook" and Apple are trademarks of Apple Inc.; the site claims no affiliation (footer).
