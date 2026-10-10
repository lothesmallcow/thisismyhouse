# Agency site plan: Soglia

Oct 10, 2026 · @lorenzo

## Verdict

The site's main job is to make your outreach convert, not to pull traffic from Google. Most visitors will arrive after your message or visit, already knowing your name. In about ten seconds they need four answers: who you are, what it costs, proof you can do it, and why it's risk-free.

**Name: Soglia** (Italian for threshold, the spot where a customer decides to walk in or keep going). I'd drop Verum for this: Verum Italy srl is a door and window handle maker in Brianza, the exact renovation and window-fitting world you're about to pitch. Keep Verum for the automation venture later, or rename it then.

**The concept that ties it together:** you sell renovations of bad websites. The signature moment on the site is a dated website being renovated on screen as the visitor scrolls. It's the product demo, the brand idea and the "cool" factor in one.

**Two flags before it goes public:**

1. **Partita IVA.** Italian tax guides say a dedicated website, a public price list and advertising all point to habitual activity, which needs a P.IVA even below €5,000 a year. Build the site now, publish it after one meeting with a commercialista. You turn 18 on Nov 22, which also clears the contract-signing question. About 70% confident on this; it's not legal advice.
2. **No fake proof.** No invented reviews, client counts or countdown timers. Your buyers are mostly microimprese, and Italian consumer law extends its unfair-practice rules to them, including a ban on falsely claiming an offer is time-limited. The founders' programme below uses real scarcity: five real spots.

**Timing:** midterms run Oct 19 to 28, so build this after. With the script at the end, Claude Code does most of the build in one long session; your review and fixes take a weekend.

## Brand

Soglia wins because the name is the pitch: the threshold where a customer decides is, today, the website. It's also the psychology behind the whole site (first impressions form in a fraction of a second), so the concept and the copy reinforce each other.

| Name | What it says to a 55-year-old business owner | Risk |
| --- | --- | --- |
| **Soglia (pick)** | "Your site is the doorstep of your business." Short, Italian, not tied to one sector. | Common word: check the domain and trademark before committing. |
| Insegna | "Your site is your shop sign." Warm, local. | Also means "teaches"; fits artisans, feels dated for B&Bs and venues. |
| Verum | Continuity with your future venture. | Verum Italy srl makes door handles in Brianza; there's also a Verum drinks brand. Latin reads cold to a contractor. |

Rejected: Facciata ("di facciata" means fake), Rifatto (slang for cosmetic surgery), Vetrina (every agency uses it).

**Check before committing (10 minutes):** domain (sogliastudio.it or soglia.studio), a trademark search on the UIBM and EUIPO databases, and the Instagram handle. I couldn't verify any of these from here.

**Logo.** The word *soglia* in lowercase, wide and heavy, sitting on a thick horizontal bar: the stone sill of a doorway, extended to the right like a step. The favicon is the bar under a lowercase *s*.

**Palette.** Taken from a Milanese entrance hall: stone floor, green front gate, brass doorbell, and the yellow of the city's trams. It deliberately avoids the three looks AI sites default to (cream with terracotta, black with neon, purple gradients).

| Token | Hex | Use |
| --- | --- | --- |
| Calce (lime white) | #F3F4F0 | Main background |
| Pietra (stone) | #DAD8D0 | Alternate sections, sills, dividers |
| Portone (gate green) | #1E3A2C | Headlines, dark sections, the recommended price panel |
| Testo | #23302A | Body text |
| Giallo tram | #F5B700 | Buttons only. Nothing else is yellow, so the eye finds the action. |
| Ottone (brass) | #A67C2E | Thin rules and small icons, sparingly |
| Marker (demo only) | #D7392B | The red circles on the "before" website in the renovation demo |

Contrast checks: dark green text on the yellow button is about 6.9:1, and white on the dark green is about 12:1, both above the WCAG AA threshold of 4.5:1.

**Type.** Archivo for headlines and interface, using its variable width axis so headlines can be set wide and heavy, and so the renovation demo can stretch text from cramped to confident. Literata for body text, at 18px minimum because your readers are on phones and many are over 50. Both are self-hosted, not loaded from Google (see Legal).

**Layout.** Left-aligned, one strong column, generous margins. Each section starts with a thick sill bar, which marks where a section begins rather than decorating it. One bold moment (the renovation) and everything else quiet. Prices are not three identical cards: the recommended plan sits on a dark green panel, the others on plain stone.

## Site map

Fourteen page types, plus the technical files. Every page ends in the same action: the free preview.

| Path | Page | Its job | Indexed by Google |
| --- | --- | --- | --- |
| / | Home | Prove the promise in one scroll: problem, renovation demo, calculator, process, guarantee, prices, founders, FAQ | Yes |
| /come-funziona | How it works | Kill every doubt about process, timing, what you need from them, and the full FAQ | Yes |
| /prezzi | Prices | Three tiers plus the monthly care plan, founder prices, what's included | Yes |
| /lavori | Work | Three complete demo sites for invented businesses, honestly labelled | Yes |
| /lavori/\[demo\] | Case page | Goal, sector problems, choices made, link to the live demo | Yes |
| /lavori/\[demo\]/demo | Demo site | A full working homepage for the invented business | No |
| /per/\[settore\] | Sector pages (3) | Renovation and window fitters, B&Bs and agriturismi, wedding venues. Link these in your outreach. | Yes |
| /chi-sono | About | You, why a student is an advantage, why "Soglia" | Yes |
| /anteprima-gratuita | Preview request | Three-step form | Yes |
| /contatti | Contact | WhatsApp, phone, email, short form | Yes |
| /grazie | Thank you | What happens next, invite to send photos on WhatsApp | No |
| /anteprime/\[nome-xxxx\] | Private pitch page | One per prospect: their current site next to their new one, your note, three buttons. Your main sales tool. | No |
| /condizioni, /privacy, /cookie | Legal | Service terms with the exact guarantee, privacy notice, cookie notice | Yes |
| /404 | Not found | "Pagina in ristrutturazione" with links home | No |

Technical: sitemap.xml, robots.txt, social preview images, favicons, structured data for Google (business and FAQ), security headers.

**The private pitch page is the most valuable page on the site.** When you contact a business, you send them a link to a page with their name on it, their current site on the left and their new homepage on the right. Seeing their own business already improved makes it feel like theirs before they've paid (see Psychology). It's hidden from Google and uses an unguessable address.

## Psychology map

Every persuasive move on the site is one of these thirteen, each used in its honest form. They're well-documented effects, but nobody knows their size on Lombard business owners: your first 20 pitches are the real test.

| Lever | What it does | Where it lives | Honest version |
| --- | --- | --- | --- |
| First impression | Visual appeal is judged in about 50 ms (Lindgaard, 2006) and colours everything after | Hero: one message, fast load, no clutter | Speed is part of persuasion: the performance budget is a sales tool |
| Loss aversion | A loss weighs more than an equal gain | "Ogni giorno qualcuno apre il tuo sito e se ne va" | Illustrative scenarios, no invented statistics |
| Self-persuasion | People believe numbers they typed themselves | The calculator: their job value, their close rate | Labelled "una stima con i tuoi numeri, non una promessa" |
| Anchoring | The first number sets the reference | Calculator shows one job's value (say €3,000) before the €990 price | Real prices, shown in full |
| Risk reversal | Removes the fear of a bad purchase | Free preview, balance paid only after approval | Exact terms on /condizioni (Italian law requires guarantees to be stated clearly) |
| Reciprocity | A gift creates a wish to give back | Free homepage preview in 72 hours | "Non ti richiamo dieci volte": no pressure follow-ups |
| Endowment | We value what already feels ours | Private pitch page showing their new site with their name | Private, hidden from Google, deletable on request |
| Scarcity with a reason | Scarcity works; giving a reason ("because") works even better (Langer, 1978) | Founders' programme: 5 spots, because you need 5 showcase cases | The counter is updated by hand and always true |
| Pratfall | A competent person admitting a weakness gains trust (Aronson, 1966) | "Perché affidarti a uno studente?" | Always "io", never a fake "noi" |
| Compromise effect | The middle option feels safest | Three tiers, Professionale highlighted | Every tier is genuinely useful on its own |
| Foot in the door | A small yes leads to a bigger yes | Form step 1 is one tap: "Che attività hai?" | No pre-ticked boxes, no tricks |
| Processing fluency | Easy-to-read claims feel more true | Short sentences, zero jargon, 18px body text | "Si legge dal telefono", never "responsive" |
| Specificity | Precise claims feel credible | "72 ore", "10 giorni lavorativi", "PageSpeed sopra 90" | Only promises you can hit and show |

**What the site never does:** fake reviews, fake visitor or client counts, countdown timers, guilt-trip buttons ("No grazie, preferisco perdere clienti"), hidden costs. Two reasons: it's illegal against microimprese in Italy, and you're selling trust, so one caught lie kills the business.

**Social proof is the gap.** You have none yet, and the site doesn't pretend otherwise. The slots for real Google reviews are built but stay empty until real clients fill them. Ask every client for an honest review after delivery, with nothing attached: Google bans discounts or freebies in exchange for reviews, so the founder price buys a case study and a reference, never a review.

## Home page copy (Italian)

The home page runs in twelve sections, in this order. It uses "tu" (warmer, normal on modern Italian sites; switch to "Lei" only if your first pitches say older owners find it rude) and "io" throughout, because it's you.

### 1. Hero

*Lever: first impression, specificity, risk reversal.*

**Chi apre il tuo sito decide in un attimo se chiamarti.**

Rifaccio i siti delle piccole imprese perché portino richieste vere: si leggono bene dal telefono, si aprono in fretta e hanno un pulsante per chiamarti o scriverti su WhatsApp. Prima di spendere un euro, vedi l'anteprima del tuo nuovo sito.

&#91;Voglio l'anteprima gratuita\] \[Guarda come funziona\]

Pronta in 72 ore. Nessun impegno, nessun pagamento anticipato.

Parli sempre con me, non con un centralino. Saldo solo a sito approvato. Il sito, il dominio e gli accessi sono tuoi.

*Beside it: a phone showing the renovated demo site, with a WhatsApp-style card popping in:* "Nuova richiesta di preventivo: bagno completo, zona Città Studi". *Small caption:* Attività di esempio.

### 2. The problem

*Lever: loss aversion. The loss is invisible, which is the point.*

**Ogni giorno qualcuno cerca quello che fai. Poi apre il tuo sito.**

- Lo apre dal telefono. Deve allargare il testo con due dita per leggerlo. Torna indietro e chiama il secondo risultato.
- Cerca un numero da chiamare. In alto non c'è. Lascia perdere.
- In fondo alla pagina legge © 2014. Pensa che abbiate chiuso.

Tu non te ne accorgi, perché chi se ne va non ti avvisa.

### 3. The renovation (signature animation)

*Lever: demonstration beats description.*

**Guarda un sito vecchio diventare uno che lavora.**

Scorri piano. L'attività è inventata, ma i difetti sono quelli che trovo ogni giorno.

Red marker notes on the old site: *Dal telefono non si legge* / *Nessun numero in vista* / *Foto sgranate, nessun lavoro vero* / *© 2011: sembra un'attività chiusa* / *"Leader nel settore" non dice niente*.

After the renovation, a checklist ticks in: Si legge da qualsiasi telefono. Chiamata o WhatsApp con un tocco. Foto dei lavori veri, prima e dopo. Le richieste arrivano già ordinate. Si vede che l'attività è viva.

&#91;Voglio vedere il mio sito così\]

### 4. Calculator

*Lever: self-persuasion and anchoring.*

**Quanto vale una richiesta in più al mese?**

Metti i tuoi numeri. Il calcolo lo fai tu.

- Quanto vale in media un tuo lavoro? (default 3.000 €)
- Su 10 preventivi, quanti diventano lavori? (default 3)
- Quante richieste in più al mese ti aspetti da un sito migliore? (default 2)

Result: *In un anno sono circa 21.600 € di lavori in più. Il sito Professionale costa 990 €: si ripaga con meno di un lavoro.*

È una stima fatta con i tuoi numeri, non una promessa. Nessuno può garantirti quante richieste arriveranno. Io posso garantirti un sito fatto per non perderle.

### 5. How it works

*Lever: lowering perceived effort; the real sequence justifies numbering.*

**Quattro passi. Il primo è gratis.**

1. **Mi racconti la tua attività.** Dieci minuti al telefono o su WhatsApp: cosa fai, per chi, dove.
2. **Ricevi l'anteprima gratuita.** Entro 72 ore ti mando la homepage del tuo nuovo sito, con il tuo nome e i tuoi servizi. La guardi dal telefono, con calma.
3. **Se ti convince, partiamo.** Mi versi un acconto del 30%. In 10 giorni lavorativi dall'arrivo di foto e informazioni, il sito è pronto.
4. **Paghi il saldo solo a sito approvato.** Lo provi, chiedi le modifiche, lo approvi. Solo allora paghi il resto e lo mettiamo online.

### 6. Guarantee

*Lever: risk reversal.*

**Il rischio me lo prendo io.**

L'anteprima è gratuita. Se non ti piace, finisce lì: non mi devi niente e non ti richiamo dieci volte. Se ti piace e partiamo, il saldo lo paghi solo dopo aver approvato il sito finito.

Due giri di modifiche inclusi. Le condizioni sono scritte, chiare e senza asterischi. \[Leggi le condizioni\]

### 7. What's inside

*Lever: benefits in the buyer's words, not features.*

**Cosa trovi nel tuo nuovo sito**

- **Si legge bene da ogni telefono.** Testi grandi, pulsanti comodi, niente zoom.
- **Ti chiamano con un tocco.** Telefono e WhatsApp sempre a portata di pollice.
- **Le richieste arrivano già ordinate.** Chi compila il modulo ti scrive su WhatsApp con un messaggio pronto: cosa serve, dove, quando. E tu ricevi anche una copia via email.
- **Ti trovano su Google.** Pagine scritte per le ricerche della tua zona, scheda Google collegata.
- **Si apre in fretta.** Punteggio di velocità sopra 90 su PageSpeed di Google, da telefono. Te lo mostro prima di consegnare.
- **In regola.** Privacy, cookie e dati aziendali a posto, senza banner inutili.
- **È tuo.** Dominio, codice e accessi intestati a te. Se un giorno vuoi cambiare, porti via tutto.

### 8. Founders' programme

*Lever: real scarcity with a reason, reciprocity.*

**Cerco i primi 5 clienti.**

Sto avviando Soglia e voglio cinque lavori fatti benissimo da mostrare. Per questo ai primi cinque faccio un prezzo fondatori. In cambio ti chiedo due cose: il permesso di mostrare il tuo sito tra i miei lavori, con il nome della tua attività, e di poterti indicare come referenza a chi me lo chiede.

Posti fondatori ancora liberi: **5 su 5**

Quando i cinque posti sono presi, il programma finisce. Il numero qui sopra lo aggiorno a mano ed è quello vero.

&#91;Prenota un posto fondatori\]

### 9. Prices (summary)

*Lever: transparency as differentiation, compromise effect.*

**Prezzi chiari, scritti qui.**

Molte agenzie scrivono "preventivo su richiesta". Io preferisco che tu sappia subito quanto spendi.

The three tiers in brief (full copy in the next section), then \[Confronta tutto nella pagina prezzi\].

### 10. Why a student

*Lever: pratfall effect, liking.*

**Perché affidarti a uno studente?**

Domanda giusta. Ho \[ETÀ\] anni, studio Economia all'Università Bocconi e non ho un'agenzia con quaranta persone. Per te significa tre cose.

- **Rispondi a me.** Niente commerciali, niente centralino: chi ti scrive è chi costruisce il sito.
- **Costo meno, senza fare peggio.** Uso strumenti di intelligenza artificiale per lavorare più in fretta. Il progetto, i testi e il controllo finale li faccio io, uno per uno.
- **Ho tutto da dimostrare.** Ogni sito è il mio biglietto da visita: non posso permettermi di farne uno mediocre.

### 11. FAQ (six on home, all on /come-funziona)

*Lever: objection handling, especially lock-in and "what if you disappear".*

- **Ci sono costi nascosti?** No. Il prezzo è quello scritto. A parte c'è solo il dominio, tra 10 e 20 € l'anno, intestato a te. Con il piano Cura è compreso.
- **Il sito resta mio?** Sì. Dominio, codice e accessi sono intestati a te. Se un giorno vuoi cambiare fornitore, ti consegno tutto.
- **E se tra un anno sparisci?** Il sito continua a funzionare anche senza di me: è su un servizio affidabile e il codice è tuo. Qualsiasi sviluppatore può prenderlo in mano.
- **Devo scrivere io i testi?** No. Li scrivo io dopo la nostra chiacchierata, tu li correggi. Mi servono solo le foto dei tuoi lavori, anche fatte con il telefono.
- **Quanto ci vuole?** L'anteprima arriva entro 72 ore. Il sito completo in 10 giorni lavorativi da quando ho foto e informazioni.
- **Come si paga?** Con bonifico: 30% quando partiamo, il saldo dopo l'approvazione. Il piano Cura si paga ogni mese e si disdice quando vuoi.

### 12. Final call

*Lever: repeat the single action, lowest-friction alternative beside it.*

**Guarda il tuo nuovo sito prima di decidere.**

Ti mando l'anteprima in 72 ore. Se non ti convince, non mi devi niente.

&#91;Voglio l'anteprima gratuita\] \[Scrivimi su WhatsApp\]

On mobile, a bar stays pinned to the bottom of the screen with both buttons.

## Other pages (Italian)

The key copy for every other page is below; the script carries the complete text, including the legal pages.

### Prices: my recommendation

These are my numbers, not market data: below the €1,500 to €3,000 an agency would quote, above the "€300 website" cousin. Sanity-check them with your contact who makes 100k before launch; they live in one config file.

| Plan | For whom | Founders (first 5) | From client 6 | What's in it |
| --- | --- | --- | --- | --- |
| Essenziale | "Per chi oggi ha solo Instagram o Google Maps." | 390 € | 590 € | One page up to 6 sections, copy written by you, call and WhatsApp buttons, form to WhatsApp and email, map and Google profile link, privacy in order, live in 7 working days |
| **Professionale** (recommended) | "Il sito completo per farti scegliere." | 690 € | 990 € | Everything above plus up to 6 pages, one page per service written for local searches, before-and-after gallery, 3-step quote form, requests also saved to a Google Sheet, Google reviews shown on the site, live in 10 working days |
| Su misura | "Per chi ha esigenze in più." | from 1.190 € | from 1.690 € | Everything above plus availability or booking requests, more languages, a simple panel to edit text and photos, extra pages, timeline agreed together |
| Cura (monthly) | "Il sito sempre in ordine, senza pensarci." | 35 €/mese | 35 €/mese | Domain and hosting handled, up to 2 changes a month within 48 working hours, monthly check, backups, cancel any time with one message |

Page headline: **Quanto costa un sito che porta richieste.** Sub: *Prezzi finali, scritti qui. Paghi il 30% quando partiamo e il resto solo a sito approvato.* The founder price is framed as a separate offer for the first five, never as a strikethrough discount, since no one has ever paid the full price yet. The VAT line is a placeholder until your commercialista confirms your regime.

Price-page FAQ adds: **Perché costi meno di un'agenzia?** *Perché lavoro da solo, senza uffici né commerciali, e uso l'intelligenza artificiale per le parti ripetitive. Il tempo che risparmio lo metto nei dettagli.* And: **Cosa succede se non approvo il sito finito?** *Lo sistemo: due giri di modifiche sono inclusi. Se dopo i due giri non sei soddisfatto, trattengo solo l'acconto e il saldo non lo paghi.*

### The guarantee, exactly (goes on /condizioni)

- The preview is free and creates no obligation. If they don't proceed, the preview stays yours and is never published.
- 30% deposit to start; deadlines run from the day you receive photos and information.
- Two rounds of changes included; extra changes are quoted before you do them.
- No approval after two rounds: you keep the deposit, they owe no balance, the site isn't published.
- After the balance: code, copy, design and domain belong to the client.
- No promise of business results or Google rankings. That line protects you and matches the calculator's disclaimer.

### About (/chi-sono)

**Ciao, sono \[NOME\].** Ho \[ETÀ\] anni e studio International Economics and Finance all'Università Bocconi. Prima di Soglia ho costruito da solo un videogioco su Roblox con il mio studio, Damalis: dal codice all'economia del gioco, tutto da zero. Lì ho imparato una cosa che vale anche per i siti: le persone decidono in pochi secondi se restare. Da quattro anni alleno una squadra di ragazzi a calcio, quindi so spiegare le cose in modo semplice.

**Perché "Soglia".** La soglia è il punto in cui un cliente decide se entrare o tirare dritto. Oggi quella soglia è il tuo sito. Il mio lavoro è fare in modo che entri.

The Damalis and coaching lines are suggestions from your background; cut either if you'd rather not mention it.

### Preview form (/anteprima-gratuita)

**Ricevi l'anteprima del tuo nuovo sito. Gratis, in 72 ore.** *Tre domande veloci. Poi ti scrivo io.*

1. **Che attività hai?** One tap: Ristrutturazioni / Serramenti e infissi / B&B o agriturismo / Location per eventi / Altro.
2. **Hai già un sito?** Sì (address field) / No, solo social o Google Maps / No, niente.
3. **Come ti contatto?** Name, business name, phone for WhatsApp, email (optional), town, best time to call, privacy consent (never pre-ticked). Button: **Mandami l'anteprima**. Under it: *Niente newsletter, niente spam. I tuoi dati li uso solo io, solo per risponderti.*

Thank-you page: **Ricevuto. Ti scrivo entro la prossima giornata lavorativa.** Then the three next steps and *Nel frattempo, se vuoi, mandami su WhatsApp due o tre foto dei tuoi lavori migliori.*

### Work (/lavori)

*Soglia è appena nata. Per farti vedere come lavoro, ho costruito tre siti completi per attività inventate, nei settori dove il sito conta di più. Appena i primi clienti mi danno il permesso, i loro lavori veri compaiono qui.* Three demos: **Arcadi Ristrutturazioni** (Milan renovation firm, goal: more quote requests from phones), **Cascina Rovere** (agriturismo in Brianza, goal: direct bookings instead of portal commissions), **Villa Ortensia** (Lake Como wedding venue, goal: visit requests from couples already on budget). Each labelled "Progetto dimostrativo per un'attività inventata".

### Sector pages (/per/...)

| Page | Headline | Opening line |
| --- | --- | --- |
| Renovation and windows | Siti per imprese di ristrutturazione e serramentisti a Milano | Chi deve rifare il bagno confronta tre imprese dal telefono, la sera. Sceglie quella che sembra più seria e più facile da contattare. |
| B&Bs and agriturismi | Siti per B&B, agriturismi e piccoli hotel in Lombardia | Ogni prenotazione diretta è una commissione in meno ai portali. Ma l'ospite prenota da te solo se il tuo sito gli dà fiducia. |
| Wedding venues | Siti per location di matrimoni ed eventi | Una coppia guarda decine di location prima di chiederne tre. Se il sito non è all'altezza della villa, la villa non entra nella lista. |

Each then lists three sector problems, what you build, the WhatsApp request flow for that sector, two FAQs and the preview button.

### Private pitch page (/anteprime/...)

**\[Nome attività\], ecco come potrebbe essere il tuo nuovo sito.** *L'ho preparato senza impegno, partendo dal tuo sito attuale e dalla tua scheda Google.* Then "Oggi" and "Domani" side by side, three things you changed, your personal note, and three buttons: **Mi piace, parliamone** / **Ho qualche dubbio** / **Non mi interessa**. The last one answers *Grazie per averci dato un'occhiata. Non ti disturbo più.* with no guilt trip. Footer: *Questa pagina è privata e non compare su Google. Se preferisci, la cancello.*

### 404

**Questa pagina è in ristrutturazione.** *Succede anche ai siti migliori. Torna alla home o guarda come funziona.*

## Animations

One showpiece, a handful of small motions that answer what the visitor does, and nothing else. Scattered fade-ins on every section are the clearest sign of an AI-made site; the renovation is what people will remember and describe to others.

### The motion list

| # | Animation | Trigger | What happens | Tool |
| --- | --- | --- | --- | --- |
| A1 | Hero entrance | Page load, once | Headline lines rise out of a mask, staggered; phone slides up; a WhatsApp-style card pops onto the phone at 1.6 s, twice more, then stops | GSAP + SplitText |
| A2 | **The renovation** | Scroll, pinned on desktop | Old site gets marked up, scaffolded, rebuilt piece by piece, unwrapped, ticked off (stages below) | GSAP ScrollTrigger, Flip, DrawSVG |
| A3 | Calculator result | Typing or sliding | Numbers count to the new value in 0.4 s | GSAP |
| A4 | Process line | Scroll | A line draws down the four steps as you read | CSS scroll-driven animation, static line where unsupported |
| A5 | FAQ | Tap | Answer opens smoothly | CSS only |
| A6 | Form steps | Next or Back | Step slides 16 px and fades, progress bar fills | CSS + a few lines of JS |
| A7 | Page change | Clicking a link | 200 ms cross-fade between pages | CSS view transitions (Chrome and Safari; others simply skip it) |
| A8 | Smooth scroll | Wheel on desktop | Inertia scrolling | Lenis, off on touch screens and when reduced motion is on |
| A9 | Buttons | Press | Slight press-in | CSS |

The founders' counter never animates: a number that ticks feels like a sales trick, and this one has to read as plain truth.

### The renovation, stage by stage

1. **Prima (0 to 15% of the scroll):** the old site for "Impresa Edile Arcadi" sits in a desktop frame: Times and Comic Sans, blue underlined links, a visitor counter, "Benvenuti nel nostro sito!!!", © 2011, a pixelated photo. Five red marker circles and notes appear one by one.
2. **Cantiere (15 to 35%):** scaffolding lines draw themselves over the page, a yellow "CANTIERE" sign drops in, the old site fades to grey.
3. **Lavori (35 to 70%):** pieces swap one at a time: header wipes to the new one, the headline stretches from cramped to confident, the photo sharpens from pixelated to crisp, call and WhatsApp buttons pop in, and the frame reshapes from desktop to phone.
4. **Smontaggio (70 to 85%):** scaffolding lifts away.
5. **Consegna (85 to 100%):** the five checklist items tick in and the button appears.

On phones the section isn't pinned: it becomes three stacked scenes (Prima, Cantiere, Dopo), each playing its short sequence as it scrolls into view. With reduced motion switched on, the visitor sees the before and after side by side, notes visible, nothing moving.

### How to get animations with prompts only

You never animate by hand. You describe motion precisely enough that there's only one way to build it. Claude Code gets it right first time when every animation prompt answers these nine questions:

1. **Trigger:** load, scroll into view, scroll position (scrubbed), tap, hover.
2. **Target:** which element, by its role ("the hero headline, split into lines").
3. **From and to:** start and end state, using only transform, opacity and clip-path, which the browser animates cheaply.
4. **Timing:** duration in seconds, delay, stagger between items, and the easing by name.
5. **Scroll mapping:** where it starts and ends, whether it is pinned, whether it follows the scroll exactly ("scrub").
6. **Fallbacks:** what users with reduced motion see, what happens without JavaScript, what unsupported browsers get.
7. **Mobile:** same, simpler, or off.
8. **Budget:** keep 60 fps, no layout jumps, the page usable before the animation code loads.
9. **Verification:** how Claude proves it works (screenshots at set points of the scroll).

**Vocabulary that makes your feedback precise.** Easing: *power2.out* (quick start, soft landing, the default for entrances), *power3.inOut* (smooth both ends, for things moving across the screen), *expo.out* (snappy), *back.out* (a small overshoot, playful, use once at most). *Stagger*: delay between items in a group. *Scrub*: animation tied directly to the scroll. *Pin*: section freezes while its animation plays. *Mask reveal*: text rises from behind an invisible edge. *FLIP*: an element smoothly moves to its new place after a layout change. When something feels off, say it in these words: "too floaty, cut to 0.35 s with power2.out" works; "make it better" doesn't.

**How Claude checks motion it can't watch.** Claude sees screenshots, not video. So the script makes it add a debug mode (open any page with ?debug=1 to show scroll markers and a slider that scrubs the renovation) and take screenshots at 0, 25, 50, 75 and 100% of each scroll animation. You watch the real thing and give feedback in the vocabulary above.

### The prompts

These are already inside the full script. Use them on their own when you want to redo one animation.

**A1, hero entrance**

```
Animate the home hero on first load only. Split the H1 into lines with GSAP SplitText (type "lines", mask "lines"). Each line moves from yPercent 105 to 0, duration 0.8s, ease power3.out, stagger 0.08s, starting at 0.1s. The subheading, then the button row, fade from opacity 0 and y 12px to their final state, 0.5s, power2.out, starting 0.35s after the last line begins. The phone mockup goes from y 24px and opacity 0 to its final state over 0.9s, power3.out, starting at 0.25s. At 1.6s, the notification card inside the phone scales from 0.92 and opacity 0 to 1, 0.45s, back.out(1.6), stays 3s, fades out over 0.3s; repeat twice more 5s apart, then leave it visible. Keep text in the DOM before JS runs: no hidden-by-default states without JS. With prefers-reduced-motion, show everything in its final state and the card visible, no motion. Verify: screenshot at 0s, 0.5s, 1.2s and 2.2s after load at 390px and 1440px.
```

**A2, the renovation**

```
Build the "Ristrutturazione" section as one GSAP timeline driven by ScrollTrigger. Desktop (min-width 768px): pin the section, start "top top", end "+=300%", scrub 0.6. Stages by timeline progress: 0-0.15 five red marker annotations appear on the old site one by one (scale 0.6 to 1, opacity 0 to 1, stagger evenly); 0.15-0.35 scaffold SVG lines draw with DrawSVGPlugin from 0% to 100%, the yellow CANTIERE sign drops from y -40px with a slight rotation to its resting angle, the old-site layer goes to grayscale(1) and opacity 0.6; 0.35-0.70 swap pieces in order: header via clip-path wipe left to right, headline font-variation-settings 'wdth' from 62 to 112, photo from blur(8px) on a pixelated image to the sharp image, the call and WhatsApp buttons scale in from 0.8, and the frame changes from a 4:3 desktop frame to a phone frame using GSAP Flip; 0.70-0.85 scaffold lines retract with DrawSVG back to 0% and move up 30px while fading; 0.85-1.0 the five checklist items tick in, stagger 0.03 of progress, then the CTA fades in. Mobile (below 768px): no pinning. Render three stacked scenes (Prima, Cantiere, Dopo); each plays its own short timeline (1.2s max) once when 40% visible. Reduced motion: render Prima and Dopo side by side (stacked on mobile) with all annotations and checklist visible, no motion. Add a text summary for screen readers describing the before and after. Debug: with ?debug=1, show ScrollTrigger markers and a range slider that sets the timeline progress. Verify: screenshot the pinned section at progress 0, 0.25, 0.5, 0.75 and 1 at 1440px, and each mobile scene at 390px.
```

**A4, process line**

```
In the four-step process list, draw a 2px vertical line in Portone green behind the step numbers. Use a CSS scroll-driven animation: animation-timeline: view(); animation-range: entry 20% cover 60%; scaleY from 0 to 1 with transform-origin top. Wrap it in @supports (animation-timeline: view()); outside the @supports block the line is fully drawn. No JavaScript. With prefers-reduced-motion, the line is fully drawn.
```

**A6, form steps**

```
In the three-step preview form, transition between steps by moving the outgoing step x -16px with opacity to 0 over 0.2s, then the incoming step from x 16px and opacity 0 to rest over 0.25s, power2.out (reverse directions on Back). The progress bar fills to 33, 66 or 100% with a 0.3s width transition. Move focus to the new step's first field after the transition. Reduced motion: switch steps instantly. The form must still submit as one page if JavaScript fails.
```

## Building with AI

Use Claude Code with Astro, and host on Cloudflare Pages. It's the best quality you can get from prompts, it costs nothing to run, and it's the same stack you'll use for client sites, so your own site doubles as practice and proof.

### The options

| Route | Quality from prompts | Speed and SEO | Running cost per site | Lock-in | Fit for you |
| --- | --- | --- | --- | --- | --- |
| **Claude Code + Astro (pick)** | Highest, with the design plugin and a written brief | Static pages, very fast, clean for Google | Free hosting; domain only | None: the code is yours | You've already built with Claude Code |
| Lovable, Bolt, v0 | Good for apps, generic for marketing sites | Usually single-page React apps, weaker for search out of the box | Monthly plan | Medium | Fine for prototypes, wrong for client sites |
| Framer, Webflow (AI features) | Good, very visual | Good | Monthly plan per site | High | Worth it only for clients who insist on editing everything themselves |
| Wix, Squarespace AI | Template-level | Fine | Monthly plan | High | This is what you compete against, not what you use |

**Hosting: avoid Vercel's free plan.** Its Hobby tier is limited to personal, non-commercial use, and a business site breaks that. Cloudflare Pages' free tier allows commercial use and has no bandwidth cap. That matters for your margins: if hosting is free, almost all of the 35 € a month care plan is profit.

### The stack (all free)

- **Astro** (latest version, needs Node 22 or newer): builds plain fast pages, adds JavaScript only where needed.
- **Tailwind CSS**: styling inside the code, quick to change by prompt.
- **GSAP with ScrollTrigger, SplitText, Flip and DrawSVG**: all plugins became free, including for commercial use, after Webflow took GSAP over.
- **Lenis**: smooth scrolling that keeps keyboard and in-page search working, synced with GSAP.
- **Fonts self-hosted** through Fontsource packages.
- **Web3Forms** for form emails (free, no server needed), plus an optional Google Apps Script that logs each request into a Google Sheet: your own site runs the small automation you sell.
- **Cloudflare Web Analytics**: visitor stats without cookies.

### The workflow

1. **Install the official design plugin.** Inside Claude Code: `/plugin marketplace add anthropics/claude-code`, then `/plugin install frontend-design@claude-code-plugins`. It makes Claude commit to a design direction before coding instead of producing the generic AI look. If that marketplace name fails, try `/plugin install frontend-design@claude-plugins-official`.
2. **Give Claude eyes.** `claude mcp add playwright -- npx -y @playwright/mcp@latest` lets it open your site in a real browser, click through it and take screenshots.
3. **Start in plan mode** (Shift+Tab until it says plan mode), paste the script, read the plan it proposes, then approve.
4. **The script saves itself into the project first** (docs/BRIEF.md and CLAUDE.md), so the brief survives when a long session's memory gets compressed.
5. **It builds in phases and commits to git after each one**, so you can always go back.
6. **One checkpoint:** after the design system, it stops and shows you screenshots. Taste is decided there; everything after follows it.
7. **It checks itself:** screenshots of every page at phone, tablet and desktop width, a Lighthouse score, an accessibility scan, broken links, leftover placeholders.
8. **You review on your own phone**, then give feedback in concrete terms (see the animation vocabulary).

### Prompting rules that make the difference

- **Give the real content, not "lorem ipsum".** Copy shapes design; generic text gets a generic layout.
- **Name the defaults to avoid.** Anthropic's own guidance says Claude drifts toward the most common design choices unless told otherwise, so the script lists them explicitly.
- **Describe references in words.** "A Milanese entrance hall: stone, green gate, brass" works better than "make it look premium".
- **One change per message when iterating.** "Make the hero headline 10% smaller on mobile" beats a list of twelve fixes.
- **Ask for screenshots after every visual change**, and say which width.
- **Keep a CLAUDE.md** with rules you've had to repeat. Each correction you give twice goes in there.

## Legal and compliance

The site is built to be publishable in Italy; three items need a professional before it goes live. None of this is legal or tax advice; confidence levels are mine.

- [ ] **Partita IVA and tax regime** (commercialista, one meeting). A dedicated site and public prices suggest habitual activity, which needs a P.IVA regardless of income. Once you have one, Italian law requires it on the home page; the footer has the slot. The €5,000 figure people quote is a pension-contribution threshold, not a P.IVA exemption. About 70% confident.
- [ ] **Have the terms and privacy notice reviewed.** The script drafts complete versions of both, but drafts written by an AI shouldn't go live unreviewed when they define your guarantee.
- [ ] **No cookie banner, verified.** The Garante's 2021 guidelines say a site using only technical cookies doesn't need a consent banner. The site sets no cookies of its own and uses Cloudflare's cookieless analytics. Check in your browser's developer tools after deploying that no cookies appear; an older independent review claimed Cloudflare's beacon once set one.
- [x] **Fonts self-hosted.** A Munich court ruled in 2022 that loading Google Fonts from Google's servers without consent breached the GDPR. The script self-hosts both fonts.
- [x] **No misleading claims.** Business-to-business advertising must be truthful and must state guarantee terms clearly (D.Lgs. 145/2007); the consumer code's unfair-practice rules also cover microimprese. Hence no fake reviews, real founder scarcity, and the guarantee written out on /condizioni.
- [x] **Privacy notice for the form** (GDPR art. 13): what's collected, why, how long it's kept, who processes it, rights, how to complain to the Garante. Your name and contact details are placeholders.
- [x] **Demo sites use invented businesses.** Don't put real businesses' sites in your public portfolio without permission. The private pitch pages are fine: they're addressed to the business itself and hidden from search.
- [x] **Nothing promises results.** The terms say outright that no number of leads or Google ranking is guaranteed, matching the calculator's disclaimer.
- [x] **Reviews are never paid for.** Google's review policy prohibits offering discounts, free goods or services in exchange for a review, and it now surveys users about it. The founder price is exchanged for portfolio rights and a reference only.

One more: your outreach channel. Last chat's conclusion still holds: a few personal, individually written emails are low risk; automated sequences are not. The pitch pages are designed to be linked from WhatsApp or in person.

## The Claude Code script

The file **soglia-claude-code-script.md** (sent in our chat) builds the entire site from one paste. Its top part is setup steps for you; everything below the marked line goes into Claude Code.

**What it makes Claude Code do, in order:** save the brief into the project, set up Astro and the design system, stop once for your approval on the look, build every page with the final Italian copy, the calculator and the three-step form, the three demo sites with real stock photos, the private pitch pages and a command to create new ones, all nine animations with phone and reduced-motion versions, SEO and structured data, legal pages, the Google Sheet automation, then a full quality pass (screenshots at three widths, Lighthouse, accessibility scan, placeholder check, a hunt for dashes and English leftovers). It ends with a README on deploying to Cloudflare Pages and a TODO list for you. It does not deploy anything itself.

**What's left for you after it finishes:**

- [ ] Fill src/config/site.ts: name, age, photo, legal name, P.IVA, address, email, phone, WhatsApp, domain, legal update date, VAT note
- [ ] Confirm or cut the Damalis and coaching lines on /chi-sono
- [ ] Create three free accounts: Web3Forms key, Cloudflare (hosting and analytics), the domain
- [ ] Delete the example pitch page before launch
- [ ] Check the prices with your 100k contact
- [ ] Commercialista meeting, then `npm run predeploy`, then publish

**When you start using it for outreach:** run `npm run nuova-anteprima` for each business, drop in a screenshot of their current site and of the preview you built, write one personal line, and send them the link.

## Sources

Name collision

- [Verum Italy srl, door and window hardware (Frontale exhibitor page)](https://www.frontale.de/en/exhibitors/verum-italy-srl-2275067)

Psychology

- [Nature, 2006: web users judge sites in 50 milliseconds (Lindgaard et al.)](https://www.nature.com/news/2006/060109/full/news060109-13.html)

Building with AI

- [Anthropic cookbook: prompting for frontend aesthetics](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics)
- [frontend-design plugin, install commands](https://claudelog.com/faqs/what-is-frontend-design-skill-in-claude-code/)
- [Playwright MCP, getting started](https://playwright.dev/python/docs/getting-started-mcp)
- [GSAP: all plugins free, including commercial use](https://cdn.jsdelivr.net/npm/gsap@3.15.0/README.md)
- [Lenis with GSAP ScrollTrigger](https://github.com/kushgaikwad/lenis)
- [CSS scroll-driven animations: browser support](https://ics.media/en/entry/230718/)
- [Vercel Hobby plan: commercial use not allowed](https://conductatlas.com/platform/vercel/vercel-terms-of-service/provision/CA-P-048642/hobby-plan-personal-non-commercial-use-only/)
- [Cloudflare Pages free plan: commercial use, unlimited bandwidth](https://vpsranking.com/serverless/cloudflare-pages/)
- [Cloudflare Web Analytics: no client-side state](https://www.cloudflare.com/sv-se/web-analytics/)
- [Independent review of Cloudflare Web Analytics (older, cookie claim)](https://www.ctrl.blog/entry/review-cloudflare-analytics/)
- [Astro 6 tutorial (version and Node requirement)](https://tech-insider.org/fr/tutoriel-astro-6-site-performant-13-etapes-2026/)

Legal

- [Fiscozen: when you need a Partita IVA](https://www.fiscozen.it/guide/quando-non-si-deve-aprire-la-partita-iva/)
- [Trend Online: the €5,000 threshold is not a P.IVA exemption](https://www.trend-online.com/fisco-tasse/prestazione-occasionale-che-succede-se-supero-limite/)
- [Codice del Consumo art. 23, practices always misleading](https://www.brocardi.it/codice-del-consumo/parte-ii/titolo-iii/capo-ii/sezione-i/art23.html)
- [Codice del Consumo text extending unfair-practice rules to microimprese](https://docs.univr.it/documenti/OccorrenzaIns/matdid/matdid235492.pdf)
- [D.Lgs. 145/2007, misleading advertising between professionals](https://www.diritto.it/la-disciplina-della-pubblicita-ingannevole-e-di-quella-comparativa-il-decreto-legislativo-n-145-del-2007/)
- [iubenda on the Garante's 2021 cookie guidelines](https://www.iubenda.com/it/help/31253)
- [Google Fonts and the Munich ruling](https://gomakethings.com/google-fonts-and-gdpr/)
- [Search Engine Land: Google bans incentivised reviews](https://searchengineland.com/google-prohibits-incentivizing-customers-to-remove-or-modify-negative-reviews-387874)
