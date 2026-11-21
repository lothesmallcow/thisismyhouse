# Brief for Claude Design: the site report (/analisi-sito/)

Paste the prompt below into a new Claude Design project. Attach: a screenshot of the Apple Health
sleep score Lorenzo likes, a screenshot of the Focus Design home, and `focale/src/styles/global.css`.
When the design is approved, hand it off to Claude Code (or export the HTML) and give it to the
session that owns this repo: it will wire the design to the real data (src/scorer/, scripts/scorer-ui.ts).

---

Progetta la pagina "Analisi del sito" di Focus Design, uno studio web di Milano che rifà i siti di piccole attività (studi fitness, B&B, ristoranti, imprese edili...). Chi la usa è il titolare: incolla l'indirizzo del suo sito e riceve un report privato con un voto su 100. Deve sembrare a tutti gli effetti un report bello da leggere, come il punteggio del sonno nell'app Salute di Apple dopo una dormita: chiaro, calmo, premiante, con animazioni curate. Non copiare Apple: prendi l'idea (un anello fatto dei componenti del voto, il numero grande al centro, una parola di giudizio, i componenti sotto con le loro barre, poche frasi che spiegano).

Stile (obbligatorio, è lo stile del sito):
- Colori: bianco #FFFFFF, inchiostro navy #0B1B3F, blu del marchio #13307A, testo secondario #4A5572, superfici chiare #F1F4FA, linee #DDE3EF. Arancione #FF6A1F solo per i pulsanti principali, con testo navy (mai bianco).
- Per i componenti del voto puoi usare una palette di colori per i dati, ma armonica con il navy e accessibile (contrasto WCAG AA).
- Carattere: Schibsted Grotesk (titoli 800/700, testo 400 a 17-18 px). Pulsanti a pillola.
- Niente sfumature decorative, niente vetro smerigliato, niente etichette tutte maiuscole, niente emoji, niente lineette lunghe nel testo.
- Telefono prima di tutto (390 px), poi computer (1440 px). Pulsanti almeno 44 px.
- Animazioni solo con trasformazioni e opacità, che rispettano "riduci movimento". Nessuno spostamento del layout.
- Testi in italiano, tono "noi", semplice. Nessuna statistica inventata, nessun "batti X concorrenti", nessuna promessa di clienti o fatturato.

La pagina ha questi stati:
1. Inizio: titolo "Quanto lavora il tuo sito? Scoprilo in un minuto.", campo "Indirizzo del sito", scelta "Settore" (con "Lo capiamo noi dalla pagina" e "Altro"), pulsante "Analizza il sito", frase sulla privacy ("Il risultato lo vedi solo tu"). Due link per vedere un esempio su un sito inventato.
2. Attesa (fino a un minuto): qualcosa di vivo ma onesto, per esempio l'anello che si costruisce mentre scorrono i nomi dei controlli ("Si prenota online", "Il numero si chiama con un tocco"...). Niente percentuali finte.
3. Report: il cuore della pagina, descritto sotto.
4. Errore: frase chiara su cosa è successo e cosa fare (es. "Questo è un profilo social, non un sito tuo").

Il report contiene, in quest'ordine:
- Testata: "Report del sito", indirizzo del sito grande, settore, data, come è stata misurata la velocità. Scelta "Valutato come" per cambiare settore (il voto si ricalcola subito). "Stampa o salva in PDF".
- Il voto: anello con un arco per ogni categoria (lunghezza = peso della categoria, riempimento = punti presi), numero al centro che conta fino al voto, parola di giudizio (Ottimo da 90, Buono 75-89, Discreto 50-74, Da sistemare sotto 50). Sotto, le categorie con colore, nome, punti (es. 16,5/20), barra e una riga ("Persi 3,5 punti in 1 controllo").
- In sintesi: una frase ("Il sito prende 63 punti su 100. Va meglio in ricerca locale, perde di più in percorso di prenotazione."), poi tre punti salienti: Punto forte, Da sistemare per primo, Controlli superati in pieno.
- Perché X e non 100: ogni punto perso, dal più pesante: "-7 La pagina si vede in fretta dal telefono: la pagina appare in 5,2 secondi, troppo."
- Le 5 cose che valgono più punti: ognuna con "+N punti", cosa abbiamo trovato, perché conta, cosa facciamo noi, e il totale che sale ("Sistemando queste 5 cose passi da 49 a 73").
- Da verificare con chi ti segue: avvisi che non tolgono punti (es. "Partita IVA non trovata in questa pagina").
- Tutti i controlli, uno per uno (chiuso, si apre).
- Cosa possiamo fare noi (fascia navy): confronto grande "49 → 100" con il nostro sito d'esempio misurato con la stessa griglia, tre pacchetti (Essenziale 600 €, Completo 900 € evidenziato, Su misura 1.200 €) con "Consigliato per te" e il perché, la Cura 39 € al mese facoltativa.
- Un solo invito finale: email con casella del consenso NON spuntata e link all'informativa privacy, pulsante "Voglio l'anteprima gratuita".

Dati di esempio da usare (studio fitness inventato, voto 12):
- Velocità e telefono 3/20, Percorso di prenotazione 4,5/32, Ricerca locale 1,5/15, Fiducia 2/10, Accessibilità 0/8, Basi legali 0/10, Chiarezza 1/5.
- Punti persi principali: -8 Si usa bene anche con difficoltà di vista o di movimento (controllo automatico 71 su 100); -7 La pagina si vede in fretta dal telefono (5,2 secondi); -5 Il pulsante principale è in alto; -5 C'è una lezione di prova; -5 Le recensioni si vedono.
E un secondo esempio quasi perfetto (voto 97): Velocità 16,5/20, tutte le altre categorie piene; unico punto perso -3,5 "La pagina si vede in fretta dal telefono" (2,9 secondi).

Consegna: un prototipo HTML/CSS/JS statico, con gli stati sopra e i due esempi, pronto da passare a Claude Code. Usa nomi chiari per le parti che riceveranno i dati veri (voto, categorie, controlli, correzioni, avvisi, pacchetti).
