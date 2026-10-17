# Arcadi: tutte le foto con ChatGPT in una volta

Un solo messaggio da copiare e incollare in ChatGPT. Le fa tutte e 22, in 3 gruppi.

## Come si usa

1. Apri una chat nuova di ChatGPT con le immagini attive. Se c'è la modalità **Thinking**, attivala: secondo le fonti, è lì che ChatGPT Images 2.0 fa fino a 8 immagini per messaggio.
2. Copia tutto il blocco qui sotto (dal primo "I need" fino a "Start now with BATCH 1.") e incollalo.
3. Quando finisce un gruppo, scrivi `continua`. In tutto sono 3 gruppi: 8, 8 e 6 immagini.
4. Alla fine ti propone uno zip con tutte le foto. Se non riesce, scaricale una alla volta con il nome scritto sotto ciascuna.
5. Metti le foto in una cartella e passale alla chat nuova insieme a `HANDOFF-ARCADI.md`.

## Cosa può andare storto (e cosa fare)

Le fonti qui sotto non sono documentazione ufficiale di OpenAI: sono guide e blog di terzi, e alcune vendono strumenti.

- **Fa un'immagine sola, o un collage con più foto in una.** È un problema noto. Rispondi: `Generate them as separate images, one file each, no collage.` Se insiste, fagliele fare una per messaggio scrivendo `continua`.
- **I "dopo" sono stanze diverse dal "prima".** Rispondi con il nome del file sbagliato e `This must be an edit of [nome]-prima.jpg: same camera, same walls and windows, only the finishes change.` Se proprio non combacia, apri il "prima", premi **Modifica** e incolla solo il prompt di quel "dopo" (li trovi anche in `PROMPT-IMMAGINI.md`).
- **Niente zip.** Non c'è un tasto "scarica tutto" in ChatGPT. Esistono estensioni del browser che scaricano tutte le immagini di una chat in uno zip, ma sono di terzi e non le ho provate. Scaricarle una alla volta va benissimo: sono 22.
- **Raggiungi il limite di immagini.** I limiti cambiano a seconda dell'abbonamento e non sono pubblici. Se si ferma, riprendi più tardi nella stessa chat con `continua`, così i "prima" restano lì e i "dopo" possono modificarli.
- **Prima di tenerle, guardale:** niente scritte, niente volti, linee dritte. E per ogni coppia sovrapponi il prima e il dopo: finestre e porte devono coincidere.

Fonti (fiducia media):
- [The Decoder, ChatGPT Images 2.0](https://the-decoder.com/openais-chatgpt-images-2-0-thinks-before-it-generates-adding-reasoning-and-web-search-to-image-creation/): fino a 8 immagini per prompt, legato alla modalità thinking.
- [GlobalGPT](https://www.glbgpt.com/hub/can-chatgpt-generate-multiple-images-at-once-2025-definitive-guide/) e [ImagineGo](https://imaginego.ai/blog/how-to-generate-multiple-images-at-once-in-chatgpt-image-2-0): nell'app non è sempre affidabile.
- [OpenAI Community](https://community.openai.com/t/prompting-issue-multiple-separate-images-become-one-multi-panel-image/1380708): immagini separate che diventano un collage.
- [GPT Pro Tools](https://gptprotools.com/blog/how-to-download-chatgpt-images): nessun "scarica tutto" nativo, solo estensioni.

## Il messaggio da incollare

```
I need 22 photos for a demonstration website of an INVENTED renovation company in Milan, Italy ("Arcadi Ristrutturazioni"). They replace placeholder illustrations. Please generate them for me following these rules exactly.

HOW TO DELIVER
- Generate each photo as a SEPARATE image, never a grid, collage or multi-panel image.
- Work in the 3 batches listed below. Generate one whole batch per reply (up to 8 images), then stop and wait until I write "continua".
- Under each image write only its file name (for example: bagno-prima.jpg), so I can save it with that name.
- Landscape 3:2 (1536x1024) for every image.
- "-dopo" images are BEFORE/AFTER pairs: each one must be an EDIT of the "-prima" image you made in batch 1 with the same name, not a new picture. Keep exactly the same camera position, framing, walls, windows, doors and ceiling height; change only what the prompt says. If you cannot edit several images in one reply, do the six "-dopo" one per reply and tell me to write "continua" each time.
- When all 22 are done, try to put them all in one ZIP file named arcadi-foto.zip, each with its file name, and give me the download link. If you cannot access the images to zip them, just tell me and I will download them one by one.

RULES FOR EVERY IMAGE
- Photorealistic real photographs, as if taken by the company itself in real Milan apartments: never glossy 3D renders or magazine shots.
- No people's faces anywhere. Hands and forearms are allowed only where the prompt says so.
- No readable text, no brand names, no logos, no watermarks (not on boxes, tools, appliances or signs).
- Real Italian details: Italian sockets and switches, plausible fixtures with drains, straight walls, continuous tile joints and parquet patterns.
- All 22 must look shot by the same photographer. Apply this style to every single image:
Style: photorealistic real photograph, not a render. Camera at about 120 cm height, 24mm lens for rooms, 50mm for details, straight verticals, no wide-angle distortion. Soft overcast Milan daylight, neutral-warm white balance, natural colour, mild noise in the shadows, no HDR look, no cinematic lighting, no dramatic colour grading. Real textures and small imperfections. No people's faces, no text, no logos, no watermarks.

THE 22 IMAGES

BATCH 1 (8 images)

1. hero.jpg
Photorealistic real-estate photograph of a renovated living room in a 1960s apartment block in Milan, Italy. Open plan: a kitchen with a white matte peninsula faces the living area. Natural oak herringbone parquet with slight colour variation between planks, warm-white matte walls, recessed spotlights in a lowered plasterboard ceiling along the old corridor line, a cast-iron radiator kept and painted white under a window with roller shutters half raised. Two street-facing windows. Lived-in but tidy: a folded throw on a grey sofa, a floor lamp, faint scuffs on the skirting. Leave calm empty wall space on the left third of the frame for text. It should look like a photo the contractor took on delivery day.

2. bagno-prima.jpg
Unglamorous phone photo of an original 1970s bathroom in a Milan condominium before renovation, about 7 square metres. Beige 20x20 cm wall tiles up to about 120 cm with a brown decorative border, painted plaster above with a slight damp stain near the ceiling, enamelled bathtub with a chrome mixer and shower hose, pedestal washbasin, a visible wall-mounted water heater, small frosted window, worn grey-white terrazzo floor with a hairline crack. Flat light from the window plus a single ceiling bulb, slightly cool. Shot from the doorway at eye level, as if taken during the first site survey.

3. cucina-prima.jpg
Unglamorous phone photo of a small closed kitchen in a 1960s Milan apartment before renovation. Laminate wall cabinets in faded beige with metal handles, white 15x15 cm wall tiles up to 160 cm with yellowed grout, a freestanding gas cooker, an old wall boiler with exposed pipes, a small formica table against the wall, worn ceramic floor tiles in brown and cream, a fluorescent tube on the ceiling, one window onto the courtyard with a plastic roller shutter. Slightly cluttered worktop. Shot from the doorway at eye level, flat light.

4. soggiorno-prima.jpg
Unglamorous phone photo of the living room of an early-1900s apartment in the NoLo district of Milan before renovation, empty during the site survey. High ceiling about 3.2 m, two tall wooden windows with peeling paint onto the street, dated floral wallpaper partly torn, old reddish ceramic floor tiles with some cracked pieces, electrical cables in white plastic surface conduits along the walls, a cast-iron radiator, a single bare bulb hanging from the ceiling. Dust, a few boxes in a corner. Shot from the corner at eye level.

5. infissi-prima.jpg
Unglamorous phone photo of an old single-glazed wooden window in a 1950s Milan apartment near Porta Romana, seen from inside. Peeling white paint, a gap at the frame with traces of old silicone, a worn plastic roller-shutter strap on the side, a marble sill with stains, condensation marks on the glass, a radiator under the window. View of a facade across the street, blurred. Shot straight on at eye level.

6. vasca-prima.jpg
Unglamorous phone photo of a 1980s bathroom in a Milan apartment in the Isola district before renovation. Pale pink 20x25 cm wall tiles up to the ceiling, a built-in bathtub with a tiled side panel and a shower curtain on a rail, a pink washbasin on a pedestal, a framed mirror with a strip light, a small radiator, beige floor tiles, a slightly mouldy silicone line along the tub. Shot from the doorway at eye level, flat light from a small window.

7. camera-prima.jpg
Unglamorous phone photo of a bedroom in a 1970s apartment in Sesto San Giovanni before renovation, empty. Brown speckled ceramic floor tiles, walls with yellowed paint and a crack near the window, an old built-in wardrobe with veneer doors and one door off its hinge, a window with a plastic roller shutter, a radiator, a ceiling light with a dated glass shade. Shot from the doorway at eye level, flat light.

8. milano-cortile.jpg
Photo of the inner courtyard of a Milanese casa di ringhiera: continuous iron-railing balconies on three floors, laundry hanging, potted plants, faded ochre plaster, bicycles at ground level, overcast afternoon light. Shot from the courtyard at eye level, 35mm, straight verticals. No people facing the camera, no readable signs.

BATCH 2 (8 images)

9. bagno-dopo.jpg
EDIT the image you generated as bagno-prima.jpg (do not draw a new room): show the same bathroom after renovation. Keep EXACTLY the same camera position, lens, framing, room dimensions, window position and size, door frame and ceiling height. Change only finishes and fixtures: replace the tub with a walk-in shower with a frameless glass panel and a linear floor drain; large-format light-grey porcelain tiles (60x120 cm) on floor and walls; wall-hung WC and a wall-hung oak vanity with an integrated white basin; matte black taps and shower head; a recessed niche in the shower wall. Same daylight direction, slightly warmer white balance. Natural contact shadows, faint water marks on the glass. Do not change anything else. No text, no logos.

10. cucina-dopo.jpg
EDIT the image you generated as cucina-prima.jpg (do not draw a new room): show the same kitchen after renovation. Keep EXACTLY the same camera position, lens, framing, walls, window position and size, door frame and ceiling height. Change only finishes, fittings and furniture: handleless matte white kitchen units on the same walls, a thin oak worktop, a white glazed tile backsplash with thin light grout, an induction hob with a slim hood, the boiler replaced by a concealed unit inside a tall cabinet, a light oak floor, two simple pendant lights, smooth white walls. Same daylight direction from the courtyard window. Tidy but lived-in: a bowl of fruit, a tea towel. Do not change anything else. No text, no logos, no brand names.

11. soggiorno-dopo.jpg
EDIT the image you generated as soggiorno-prima.jpg (do not draw a new room): show the same living room after renovation. Keep EXACTLY the same camera position, lens, framing, room size, the two windows, ceiling height and the radiator position. Change only finishes and furnishing: wallpaper removed and walls smooth warm white, all cables hidden in the walls, natural oak herringbone parquet, the cast-iron radiator restored and painted white, the windows restored with fresh white paint, a simple plaster cornice, a grey linen sofa, a wool rug, a low oak sideboard, a large plant. Same overcast daylight from the street. Do not change anything else. No text, no logos.

12. infissi-dopo.jpg
EDIT the image you generated as infissi-prima.jpg (do not draw a new room): show the same window after replacement. Keep EXACTLY the same camera position, framing, wall opening, sill, radiator and the view outside. Change only the window: a new white double-glazed window with a slim frame and a modern lever handle, a clean new sill finish, fresh white paint on the reveal, the strap replaced by a neat motorised shutter switch on the wall (no text on it). Same light. Do not change anything else. No text, no logos.

13. vasca-dopo.jpg
EDIT the image you generated as vasca-prima.jpg (do not draw a new room): show the same bathroom after renovation, keeping a bathtub. Keep EXACTLY the same camera position, lens, framing, room dimensions, window and door position, ceiling height and the bathtub position. Change only finishes and fixtures: warm light-grey microcement on the walls and floor, a new built-in white bathtub with a fixed glass screen, a wall-hung vanity in pale oak with a round mirror, brushed brass taps, a towel radiator. Same daylight direction. Do not change anything else. No text, no logos.

14. camera-dopo.jpg
EDIT the image you generated as camera-prima.jpg (do not draw a new room): show the same bedroom after renovation. Keep EXACTLY the same camera position, lens, framing, room size, window, radiator and ceiling height. Change only finishes and furniture: light oak floor, smooth white walls with the crack repaired, a new floor-to-ceiling built-in wardrobe with matte white handleless doors in the same place as the old one, a simple bed with linen bedding, a small bedside lamp. Same daylight. Do not change anything else. No text, no logos.

15. laboratorio.jpg
Photo of a tidy small workshop of a renovation company in Milan: a workbench with hand tools hung on a pegboard, a tile cutter, rolls of protection sheet, a few tile samples and parquet samples laid out on the bench, a plan of an apartment printed on paper without readable text. No people, no logos, no brand names. Daylight from a high window.

16. cantiere-protezioni.jpg
Documentary photo of a renovation site inside a Milan apartment, mid-works. Floors covered with taped grey protection sheets, a doorway sealed with a plastic dust sheet and a zip door, furniture in the next room wrapped in plastic, a tidy stack of plain tile boxes with no brand names, a stepladder and a bucket. Even light from a work lamp mixed with daylight. Handheld at eye level, slightly imperfect framing.

BATCH 3 (6 images)

17. cantiere-impianti.jpg
Documentary photo of new plumbing and electrical work in a Milan apartment before plastering: multilayer pipes and copper pipes neatly chased into a brick wall, new electrical boxes fixed and level, corrugated conduits in straight runs, masking tape marks with no legible words. Daylight from a window on the left plus a work lamp. Handheld, eye level, 28mm.

18. cantiere-pulizia.jpg
Documentary photo of the end of a working day on a renovation site in a Milan apartment: the floor swept clean on top of the protection sheets, debris closed in heavy-duty bags by the door, tools lined up in a corner on a folded cloth, a vacuum cleaner. Late afternoon overcast light. Handheld, eye level.

19. cantiere-controllo.jpg
Close documentary photo of two hands holding a spirit level on newly laid large-format grey tiles on a bathroom wall, checking the alignment; the bubble is centred. Only hands and forearms in work clothes without any logo, no face. Daylight from the side. 50mm.

20. dettaglio-parquet.jpg
Close-up of freshly laid natural oak herringbone parquet meeting an original restored Milanese terrazzo (graniglia) threshold, with a thin brass transition strip. Raking morning light shows the wood grain and small chips in the terrazzo. Camera low near the floor, 50mm, shallow depth of field. Real texture, slight dust.

21. dettaglio-doccia.jpg
Close-up of a recessed niche in a walk-in shower wall finished with large-format light-grey porcelain tiles, perfectly aligned thin grout lines, a matte black thermostatic mixer below, a few drops of water on the tiles. Soft daylight from the side. 50mm, eye level.

22. dettaglio-finestra.jpg
Close-up of the corner of a new white double-glazed window frame in a renovated Milan flat: the lever handle, the grey gasket, the clean joint with the freshly painted plaster reveal, a marble sill. Soft overcast light through the glass. 50mm.

Start now with BATCH 1.
```
