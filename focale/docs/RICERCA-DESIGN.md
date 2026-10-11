# Ricerca: come evitare un sito che sembra fatto in automatico

Ottobre 2026. Ricerca fatta prima della quarta revisione della home, su richiesta di Lorenzo
("guarda come fare un sito professionale, non AI slop"). Le pagine complete di alcune fonti non
erano raggiungibili da questo ambiente (DNS bloccato dal proxy): dove è così, il contenuto viene
dai riassunti dei motori di ricerca. Le fonti sono quasi tutte blog di agenzie: sono opinioni
convergenti, non ricerca scientifica.

## Cosa fa sembrare un sito "AI slop"

Le fonti concordano su un elenco di segnali. Quelli che riguardano anche noi sono in grassetto.

- Inter come carattere principale; gradiente viola o indaco su bianco.
- **Righe di card identiche, tutte con lo stesso peso e lo stesso raggio degli angoli.**
  Noi: la griglia "Cosa trovi" con 7 tile uguali, le card delle FAQ, le card dei problemi.
- **Sequenze numerate di passi e banner di statistiche.** Noi: i passi 1-2-3-4, il grande "5 su 5".
- **Una dissolvenza dal basso su ogni elemento allo scroll.** Noi: la sfocatura su ogni titolo.
- **Effetti decorativi senza ruolo** (glow, glassmorphism). Noi: aloni arancioni ripetuti ovunque.
- Copy vaga e generica; titoli che potrebbero stare su qualsiasi sito.
- **Troppo testo e troppo spazio vuoto messo nel posto sbagliato** (la distanza tra due elementi
  collegati è grande quanto quella tra due sezioni).
- Mockup di dispositivi finti: rettangoli neri arrotondati che non somigliano a nessun telefono.

Perché succede: un modello senza vincoli sceglie il risultato più probabile, cioè la media del web.
La correzione non è cambiare un colore: è nominare ogni scelta di default e sostituirla con una
scelta presa dal soggetto (il nostro cliente: un artigiano o un albergatore, il telefono che squilla).

## Come lavorano i siti "a video" (Apple e simili)

- Il prodotto resta fermo e il racconto gli scorre intorno: una sezione alla volta, a schermo intero.
- Ogni scena ha **una sola idea**: un titolo corto, un'immagine forte, al massimo una riga di testo.
- Due tecniche: scorrimento collegato a una timeline (scrub) oppure sezioni a schermo intero con
  aggancio (snap), dove ogni gesto porta alla scena successiva e una breve animazione la introduce.
- Il pattern di riferimento GSAP ("Animated Continuous Sections with GSAP Observer") usa un indice,
  un flag `animating` che ignora i gesti durante la transizione, `tolerance: 10`, `preventDefault`.

## Rischi e come li gestiamo

- Lo scroll "dirottato" frustra chi usa tastiera, lettori di schermo o trackpad veloci. Per questo
  usiamo l'aggancio nativo del browser (CSS scroll snap) invece di intercettare la rotella:
  tastiera, barra di scorrimento e lettori di schermo continuano a funzionare.
- Ogni scena deve stare nello schermo: se il contenuto è più alto, la scena scorre normalmente.
- Con "riduci movimento" le animazioni si spengono, l'aggancio resta (non è movimento).

## Decisioni per Focus Design

1. La home diventa una sequenza di scene a schermo intero, con aggancio e un indicatore di
   avanzamento: si va avanti scena per scena, come un video.
2. Scene: apertura, scelta dell'attività (scena separata), il telefono, il problema, i lavori,
   il metodo e la garanzia, i prezzi, domande e chiusura. Calcolatore e "Cosa trovi" escono dalla home.
3. Testo ridotto a una frase per scena dove possibile.
4. Il telefono diventa un iPhone credibile: cornice in titanio, Dynamic Island, barra di stato,
   schermata di blocco, notifiche in stile iOS. La chiamata in arrivo nasce dalla Dynamic Island.
5. Via le animazioni ripetute su ogni titolo e il cursore personalizzato "Guarda" (funzionava male).
6. Meno card identiche, meno numeri decorativi, aloni solo dove raccontano qualcosa.

## Fonti

- [AI Slop Web Design: Complete Guide (925 Studios)](https://www.925studios.co/blog/ai-slop-web-design-guide)
- [AI Slop Fonts and Gradients: The Tells (925 Studios)](https://www.925studios.co/blog/ai-slop-design-tells)
- [Spot the Slop: A UI Designer's Guide to Fixing AI Defaults (Kosta Canatselis)](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)
- [AI Design Slop: 16 Patterns (Developers Digest)](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it)
- [Why Your AI Keeps Building the Same Purple Gradient Website](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
- [The Purple Gradient Problem (DEV)](https://dev.to/james_anderson_h/the-purple-gradient-problem-why-ai-ui-all-looks-alike-and-how-to-fix-it-3j65)
- [Anthropic frontend-design skill, recensione (Medium)](https://medium.com/@porter.nicholas/anthropic-skills-marketplace-the-anti-ai-slop-ui-design-skill-a572d0cfef4f)
- [Animated Continuous Sections with GSAP Observer (CodePen GreenSock)](https://codepen.io/GreenSock/pen/XWzRraJ)
- [GSAP Observer docs](https://gsap.com/docs/v3/Plugins/Observer)
- [Codrops: infinite scroll experience with GSAP and Lenis (2026)](https://tympanus.net/codrops/2026/05/28/the-never-ending-story-building-a-seamless-infinite-scroll-experience-with-gsap-lenis/)
- [Scrolljacking (Frontend Checklist)](https://frontendchecklist.io/rules/accessibility/scrolljacking)
- [White space: how much is too much (Appsrow)](https://www.appsrow.com/blog/white-space-in-web-design-how-much-is-too-much)
- [iPhone 15 screen sizes (Use Your Loaf)](https://useyourloaf.com/blog/iphone-15-screen-sizes/)
