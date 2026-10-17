# Arcadi Ristrutturazioni: le immagini da generare

> **Per farle tutte in una volta con ChatGPT usa `PROMPT-CHATGPT.md`**: un solo messaggio da incollare. Questo file resta come riferimento, una immagine alla volta (utile per rifare un'immagine venuta male).

Arcadi è un'impresa **inventata** (sito dimostrativo di Focus Design). Queste immagini prendono il posto delle illustrazioni di oggi in `src/assets/demo/arcadi-ristrutturazioni/`. I nomi dei file sono già quelli che il sito usa: se li salvi così, si vedono subito anche nel telefono della home e nel sito vecchio del film.

## Regole per tutte le immagini

1. **Nessuna persona riconoscibile.** Niente volti, niente "titolare", niente "squadra". Al massimo mani al lavoro. Un'impresa vera mette le sue foto: nella demo resta un riquadro "qui la foto della vostra squadra".
2. **Nessun testo o logo leggibile.** Niente scatole con marche, furgoni con scritte, etichette.
3. **Il "dopo" nasce dal "prima".** Prima generi il "prima". Poi lo carichi nello stesso strumento e chiedi la modifica con il prompt "dopo". Mai due prompt separati: le finestre e le porte non coinciderebbero e lo slider prima/dopo si vedrebbe falso.
4. **Formato: 16:10 orizzontale**, cioè 1600x1000 come quelle di oggi. Se lo strumento offre solo 3:2 (ChatGPT, Gemini), va bene: si ritaglia dopo, lasciando un po' di margine sopra e sotto.
5. **Luce milanese**, coperta e morbida, non sole dorato da rivista. È il modo più semplice per non sembrare un render.
6. **Tutte sembrano dello stesso fotografo.** In fondo a ogni prompt incolla, sempre identico, il blocco di stile qui sotto.

### Blocco di stile (incollalo in fondo a ogni prompt, senza cambiarlo)

```
Style: photorealistic real photograph, not a render. Camera at about 120 cm height, 24mm lens for rooms, 50mm for details, straight verticals, no wide-angle distortion. Soft overcast Milan daylight, neutral-warm white balance, natural colour, mild noise in the shadows, no HDR look, no cinematic lighting, no dramatic colour grading. Real textures and small imperfections. No people's faces, no text, no logos, no watermarks. Landscape 3:2.
```

### Controllo su ogni immagine, prima di tenerla

- Le linee verticali sono dritte, le ombre vanno dalla parte della finestra.
- Le fughe delle piastrelle e la spina del parquet sono continue, senza motivi che si fondono.
- Rubinetti, sanitari, scarichi e prese hanno forme possibili (prese italiane), all'altezza giusta.
- Nessuna scritta, nemmeno minuscola su scatole o termostati.
- Prima e dopo: metti le due immagini una sopra l'altra al 50% di trasparenza. Finestre, porte e soffitto devono coincidere. Se non coincidono, rifai il "dopo".

---

## 1. Hero: la foto grande in cima al sito

**File:** `hero.jpg`. Usata in cima alla demo, nel telefono della home e nel sito vecchio del film.

```
Photorealistic real-estate photograph of a renovated living room in a 1960s apartment block in Milan, Italy. Open plan: a kitchen with a white matte peninsula faces the living area. Natural oak herringbone parquet with slight colour variation between planks, warm-white matte walls, recessed spotlights in a lowered plasterboard ceiling along the old corridor line, a cast-iron radiator kept and painted white under a window with roller shutters half raised. Two street-facing windows. Lived-in but tidy: a folded throw on a grey sofa, a floor lamp, faint scuffs on the skirting. Leave calm empty wall space on the left third of the frame for text. It should look like a photo the contractor took on delivery day.
```
(+ blocco di stile)

---

## 2. I sei lavori prima e dopo

Per ognuno: prima il prompt "prima", poi carichi l'immagine e usi il prompt "dopo".

### 2.1 Bagno, zona Lambrate

**File:** `bagno-prima.jpg` e `bagno-dopo.jpg`

Prima:
```
Unglamorous phone photo of an original 1970s bathroom in a Milan condominium before renovation, about 7 square metres. Beige 20x20 cm wall tiles up to about 120 cm with a brown decorative border, painted plaster above with a slight damp stain near the ceiling, enamelled bathtub with a chrome mixer and shower hose, pedestal washbasin, a visible wall-mounted water heater, small frosted window, worn grey-white terrazzo floor with a hairline crack. Flat light from the window plus a single ceiling bulb, slightly cool. Shot from the doorway at eye level, as if taken during the first site survey.
```
Dopo (con la foto "prima" caricata):
```
Using this exact photo as the base, show the same bathroom after renovation. Keep EXACTLY the same camera position, lens, framing, room dimensions, window position and size, door frame and ceiling height. Change only finishes and fixtures: replace the tub with a walk-in shower with a frameless glass panel and a linear floor drain; large-format light-grey porcelain tiles (60x120 cm) on floor and walls; wall-hung WC and a wall-hung oak vanity with an integrated white basin; matte black taps and shower head; a recessed niche in the shower wall. Same daylight direction, slightly warmer white balance. Natural contact shadows, faint water marks on the glass. Do not change anything else. No text, no logos.
```

### 2.2 Cucina, zona Città Studi

**File:** `cucina-prima.jpg` e `cucina-dopo.jpg`

Prima:
```
Unglamorous phone photo of a small closed kitchen in a 1960s Milan apartment before renovation. Laminate wall cabinets in faded beige with metal handles, white 15x15 cm wall tiles up to 160 cm with yellowed grout, a freestanding gas cooker, an old wall boiler with exposed pipes, a small formica table against the wall, worn ceramic floor tiles in brown and cream, a fluorescent tube on the ceiling, one window onto the courtyard with a plastic roller shutter. Slightly cluttered worktop. Shot from the doorway at eye level, flat light.
```
Dopo:
```
Using this exact photo as the base, show the same kitchen after renovation. Keep EXACTLY the same camera position, lens, framing, walls, window position and size, door frame and ceiling height. Change only finishes, fittings and furniture: handleless matte white kitchen units on the same walls, a thin oak worktop, a white glazed tile backsplash with thin light grout, an induction hob with a slim hood, the boiler replaced by a concealed unit inside a tall cabinet, a light oak floor, two simple pendant lights, smooth white walls. Same daylight direction from the courtyard window. Tidy but lived-in: a bowl of fruit, a tea towel. Do not change anything else. No text, no logos, no brand names.
```

### 2.3 Soggiorno, NoLo

**File:** `soggiorno-prima.jpg` e `soggiorno-dopo.jpg`

Prima:
```
Unglamorous phone photo of the living room of an early-1900s apartment in the NoLo district of Milan before renovation, empty during the site survey. High ceiling about 3.2 m, two tall wooden windows with peeling paint onto the street, dated floral wallpaper partly torn, old reddish ceramic floor tiles with some cracked pieces, electrical cables in white plastic surface conduits along the walls, a cast-iron radiator, a single bare bulb hanging from the ceiling. Dust, a few boxes in a corner. Shot from the corner at eye level.
```
Dopo:
```
Using this exact photo as the base, show the same living room after renovation. Keep EXACTLY the same camera position, lens, framing, room size, the two windows, ceiling height and the radiator position. Change only finishes and furnishing: wallpaper removed and walls smooth warm white, all cables hidden in the walls, natural oak herringbone parquet, the cast-iron radiator restored and painted white, the windows restored with fresh white paint, a simple plaster cornice, a grey linen sofa, a wool rug, a low oak sideboard, a large plant. Same overcast daylight from the street. Do not change anything else. No text, no logos.
```

### 2.4 Finestre, Porta Romana

**File:** `infissi-prima.jpg` e `infissi-dopo.jpg`

Prima:
```
Unglamorous phone photo of an old single-glazed wooden window in a 1950s Milan apartment near Porta Romana, seen from inside. Peeling white paint, a gap at the frame with traces of old silicone, a worn plastic roller-shutter strap on the side, a marble sill with stains, condensation marks on the glass, a radiator under the window. View of a facade across the street, blurred. Shot straight on at eye level.
```
Dopo:
```
Using this exact photo as the base, show the same window after replacement. Keep EXACTLY the same camera position, framing, wall opening, sill, radiator and the view outside. Change only the window: a new white double-glazed window with a slim frame and a modern lever handle, a clean new sill finish, fresh white paint on the reveal, the strap replaced by a neat motorised shutter switch on the wall (no text on it). Same light. Do not change anything else. No text, no logos.
```

### 2.5 Bagno con vasca, Isola

**File:** `vasca-prima.jpg` e `vasca-dopo.jpg`

Prima:
```
Unglamorous phone photo of a 1980s bathroom in a Milan apartment in the Isola district before renovation. Pale pink 20x25 cm wall tiles up to the ceiling, a built-in bathtub with a tiled side panel and a shower curtain on a rail, a pink washbasin on a pedestal, a framed mirror with a strip light, a small radiator, beige floor tiles, a slightly mouldy silicone line along the tub. Shot from the doorway at eye level, flat light from a small window.
```
Dopo:
```
Using this exact photo as the base, show the same bathroom after renovation, keeping a bathtub. Keep EXACTLY the same camera position, lens, framing, room dimensions, window and door position, ceiling height and the bathtub position. Change only finishes and fixtures: warm light-grey microcement on the walls and floor, a new built-in white bathtub with a fixed glass screen, a wall-hung vanity in pale oak with a round mirror, brushed brass taps, a towel radiator. Same daylight direction. Do not change anything else. No text, no logos.
```

### 2.6 Camera, Sesto San Giovanni

**File:** `camera-prima.jpg` e `camera-dopo.jpg`

Prima:
```
Unglamorous phone photo of a bedroom in a 1970s apartment in Sesto San Giovanni before renovation, empty. Brown speckled ceramic floor tiles, walls with yellowed paint and a crack near the window, an old built-in wardrobe with veneer doors and one door off its hinge, a window with a plastic roller shutter, a radiator, a ceiling light with a dated glass shade. Shot from the doorway at eye level, flat light.
```
Dopo:
```
Using this exact photo as the base, show the same bedroom after renovation. Keep EXACTLY the same camera position, lens, framing, room size, window, radiator and ceiling height. Change only finishes and furniture: light oak floor, smooth white walls with the crack repaired, a new floor-to-ceiling built-in wardrobe with matte white handleless doors in the same place as the old one, a simple bed with linen bedding, a small bedside lamp. Same daylight. Do not change anything else. No text, no logos.
```

---

## 3. Il cantiere (per "Come lavoriamo")

Mostrano che il cantiere è ordinato e protetto: è una delle paure principali dei clienti.

**File:** `cantiere-protezioni.jpg`
```
Documentary photo of a renovation site inside a Milan apartment, mid-works. Floors covered with taped grey protection sheets, a doorway sealed with a plastic dust sheet and a zip door, furniture in the next room wrapped in plastic, a tidy stack of plain tile boxes with no brand names, a stepladder and a bucket. Even light from a work lamp mixed with daylight. Handheld at eye level, slightly imperfect framing.
```

**File:** `cantiere-impianti.jpg`
```
Documentary photo of new plumbing and electrical work in a Milan apartment before plastering: multilayer pipes and copper pipes neatly chased into a brick wall, new electrical boxes fixed and level, corrugated conduits in straight runs, masking tape marks with no legible words. Daylight from a window on the left plus a work lamp. Handheld, eye level, 28mm.
```

**File:** `cantiere-pulizia.jpg`
```
Documentary photo of the end of a working day on a renovation site in a Milan apartment: the floor swept clean on top of the protection sheets, debris closed in heavy-duty bags by the door, tools lined up in a corner on a folded cloth, a vacuum cleaner. Late afternoon overcast light. Handheld, eye level.
```

**File:** `cantiere-controllo.jpg`
```
Close documentary photo of two hands holding a spirit level on newly laid large-format grey tiles on a bathroom wall, checking the alignment; the bubble is centred. Only hands and forearms in work clothes without any logo, no face. Daylight from the side. 50mm.
```

---

## 4. Dettagli dei materiali (schede servizi, galleria)

**File:** `dettaglio-parquet.jpg`
```
Close-up of freshly laid natural oak herringbone parquet meeting an original restored Milanese terrazzo (graniglia) threshold, with a thin brass transition strip. Raking morning light shows the wood grain and small chips in the terrazzo. Camera low near the floor, 50mm, shallow depth of field. Real texture, slight dust.
```

**File:** `dettaglio-doccia.jpg`
```
Close-up of a recessed niche in a walk-in shower wall finished with large-format light-grey porcelain tiles, perfectly aligned thin grout lines, a matte black thermostatic mixer below, a few drops of water on the tiles. Soft daylight from the side. 50mm, eye level.
```

**File:** `dettaglio-finestra.jpg`
```
Close-up of the corner of a new white double-glazed window frame in a renovated Milan flat: the lever handle, the grey gasket, the clean joint with the freshly painted plaster reveal, a marble sill. Soft overcast light through the glass. 50mm.
```

---

## 5. Milano (per "Dove lavoriamo", da usare poco)

**File:** `milano-cortile.jpg`
```
Photo of the inner courtyard of a Milanese casa di ringhiera: continuous iron-railing balconies on three floors, laundry hanging, potted plants, faded ochre plaster, bicycles at ground level, overcast afternoon light. Shot from the courtyard at eye level, 35mm, straight verticals. No people facing the camera, no readable signs.
```

---

## 6. Chi siamo, senza persone

**File:** `laboratorio.jpg`
```
Photo of a tidy small workshop of a renovation company in Milan: a workbench with hand tools hung on a pegboard, a tile cutter, rolls of protection sheet, a few tile samples and parquet samples laid out on the bench, a plan of an apartment printed on paper without readable text. No people, no logos, no brand names. Daylight from a high window.
```

---

## Riepilogo dei file (22)

| File | Dove si vede |
| --- | --- |
| hero.jpg | cima della demo, telefono della home |
| bagno-prima.jpg, bagno-dopo.jpg | lavoro 1, servizio Bagni |
| cucina-prima.jpg, cucina-dopo.jpg | lavoro 2, servizio Cucine |
| soggiorno-prima.jpg, soggiorno-dopo.jpg | lavoro 3, servizio Chiavi in mano |
| infissi-prima.jpg, infissi-dopo.jpg | lavoro 4, servizio Infissi |
| vasca-prima.jpg, vasca-dopo.jpg | lavoro 5 |
| camera-prima.jpg, camera-dopo.jpg | lavoro 6 |
| cantiere-protezioni.jpg, cantiere-impianti.jpg, cantiere-pulizia.jpg, cantiere-controllo.jpg | Come lavoriamo |
| dettaglio-parquet.jpg, dettaglio-doccia.jpg, dettaglio-finestra.jpg | schede servizi, galleria |
| milano-cortile.jpg | Dove lavoriamo |
| laboratorio.jpg | Chi siamo |

Salvale tutte come JPG in una cartella e passale alla nuova chat (o mettile in `src/assets/demo/arcadi-ristrutturazioni/`). Le dimensioni e il ritaglio a 16:10 li sistema lei.
