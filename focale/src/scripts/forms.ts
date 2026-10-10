// Form behaviour: validation, the three-step preview form, Web3Forms submit, WhatsApp fallback.
type Fields = Record<string, string>;

const MSG = {
  choose: "Scegli un'opzione per continuare.",
  nome: "Scrivi il tuo nome.",
  nome_attivita: "Scrivi il nome della tua attività.",
  telefono: "Scrivi un numero di telefono valido, ad esempio 333 123 4567.",
  email: "Scrivi un indirizzo email valido, oppure lascia il campo vuoto.",
  zona: "Scrivi il comune o la zona in cui lavori.",
  privacy: "Per inviarmi la richiesta devi accettare l'informativa privacy.",
  contatto: "Scrivi un numero di telefono valido, ad esempio 333 123 4567, oppure un indirizzo email.",
  messaggio: "Scrivi il tuo messaggio.",
};

const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function isPhone(v: string): boolean {
  let d = v.replace(/[\s.\-/()]/g, "");
  if (d.startsWith("+39")) d = d.slice(3);
  else if (d.startsWith("0039")) d = d.slice(4);
  return /^(3\d{8,9}|0\d{5,10})$/.test(d);
}
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

function setError(form: HTMLFormElement, name: string, msg: string) {
  const el = form.querySelector<HTMLElement>(`[data-error="${name}"]`);
  if (el) el.textContent = msg;
  const inputs = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
  inputs.forEach((i) => {
    if (i.type === "radio") return;
    if (msg) i.setAttribute("aria-invalid", "true");
    else i.removeAttribute("aria-invalid");
  });
}

function data(form: HTMLFormElement): Fields {
  const out: Fields = {};
  new FormData(form).forEach((v, k) => {
    if (typeof v === "string") out[k] = v.trim();
  });
  return out;
}

async function send(form: HTMLFormElement, payload: Fields): Promise<boolean> {
  const key = form.dataset.key ?? "";
  const sheets = form.dataset.sheets ?? "";
  if (sheets) {
    fetch(sheets, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload) }).catch(() => {});
  }
  if (!key) return false;
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...payload, access_key: key }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && (json as { success?: boolean }).success !== false;
  } catch {
    return false;
  }
}

function waHref(form: HTMLFormElement, text: string) {
  const num = form.dataset.waNumber ?? "";
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

/* ---------------- Preview form ---------------- */
export function initPreviewForm() {
  const form = document.querySelector<HTMLFormElement>("[data-preview-form]");
  if (!form) return;
  const steps = Array.from(form.querySelectorAll<HTMLFieldSetElement>("[data-step]"));
  const label = form.querySelector<HTMLElement>("[data-progress-label]")!;
  const bar = form.querySelector<HTMLElement>("[data-progress-bar]")!;
  const other = form.querySelector<HTMLElement>("[data-other]")!;
  const url = form.querySelector<HTMLElement>("[data-url]")!;
  const submit = form.querySelector<HTMLButtonElement>("[data-submit]")!;
  const fail = form.querySelector<HTMLElement>("[data-fail]")!;
  const failWa = form.querySelector<HTMLAnchorElement>("[data-fail-wa]")!;
  const params = new URLSearchParams(location.search);
  let current = 0;

  form.classList.add("is-steps");
  steps[0].classList.add("is-current");

  // Query parameters: sector preselect, package, founders, origin page.
  const settore = params.get("settore");
  if (settore) {
    const r = form.querySelector<HTMLInputElement>(`input[name="attivita"][data-settore="${CSS.escape(settore)}"]`);
    if (r) r.checked = true;
  }
  const labels: Record<string, string> = { essenziale: "Essenziale", professionale: "Professionale", "su-misura": "Su misura" };
  const pacchetto = params.get("pacchetto");
  const pkgLine = form.querySelector<HTMLElement>("[data-package]")!;
  if (pacchetto && labels[pacchetto]) {
    (form.querySelector('[data-hidden="pacchetto"]') as HTMLInputElement).value = labels[pacchetto];
    pkgLine.innerHTML = `Pacchetto che ti interessa: <strong>${labels[pacchetto]}</strong>. <a class="link" href="/prezzi">Cambia</a>`;
    pkgLine.hidden = false;
  }
  if (params.get("fondatori") === "1") {
    (form.querySelector('[data-hidden="fondatori"]') as HTMLInputElement).value = "Sì, posto fondatori";
    if (pkgLine.hidden) {
      pkgLine.textContent = "Mi interessa un posto nel programma fondatori.";
      pkgLine.hidden = false;
    }
  }
  (form.querySelector('[data-hidden="provenienza"]') as HTMLInputElement).value = document.referrer ? new URL(document.referrer).pathname : "diretto";

  const toggleExtras = () => {
    const att = form.querySelector<HTMLInputElement>('input[name="attivita"]:checked')?.value;
    other.classList.toggle("is-on", att === "Altro");
    const sito = form.querySelector<HTMLInputElement>('input[name="sito"]:checked')?.value;
    url.classList.toggle("is-on", sito === "Sì");
  };
  toggleExtras();

  const validateStep = (i: number): boolean => {
    const d = data(form);
    let ok = true;
    let firstBad: HTMLElement | null = null;
    const fail = (name: string, msg: string) => {
      setError(form, name, msg);
      if (msg && ok) {
        ok = false;
        firstBad = form.querySelector<HTMLElement>(`[name="${name}"]`);
      }
    };
    if (i === 0) fail("attivita", d.attivita ? "" : MSG.choose);
    if (i === 1) fail("sito", d.sito ? "" : MSG.choose);
    if (i === 2) {
      fail("nome", d.nome ? "" : MSG.nome);
      fail("nome_attivita", d.nome_attivita ? "" : MSG.nome_attivita);
      fail("telefono", d.telefono && isPhone(d.telefono) ? "" : MSG.telefono);
      fail("email", !d.email || isEmail(d.email) ? "" : MSG.email);
      fail("zona", d.zona ? "" : MSG.zona);
      fail("privacy", d.privacy ? "" : MSG.privacy);
    }
    if (!ok && firstBad) (firstBad as HTMLElement).focus();
    return ok;
  };

  const show = (next: number, dir: 1 | -1) => {
    const from = steps[current];
    const to = steps[next];
    const finish = () => {
      from.classList.remove("is-current");
      to.classList.add("is-current");
      current = next;
      label.textContent = `Passo ${next + 1} di 3`;
      bar.style.width = `${((next + 1) / 3) * 100}%`;
      to.querySelector<HTMLElement>("legend")?.focus();
      if (!reduce()) {
        to.animate(
          [
            { transform: `translateX(${16 * dir}px)`, opacity: 0 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 250, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" },
        );
      }
    };
    if (reduce()) return finish();
    from
      .animate(
        [
          { transform: "none", opacity: 1 },
          { transform: `translateX(${-16 * dir}px)`, opacity: 0 },
        ],
        { duration: 200, easing: "ease-in" },
      )
      .finished.then(finish, finish);
  };

  form.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-next]")) {
      if (validateStep(current)) show(current + 1, 1);
    } else if (t.closest("[data-back]")) {
      show(current - 1, -1);
    }
  });

  let autoTimer: number | undefined;
  form.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    toggleExtras();
    if (t.name === "attivita" || t.name === "sito") setError(form, t.name, "");
    // Step 1 advances by itself after a tap, unless "Altro" needs a description.
    if (current === 0 && t.name === "attivita" && t.value !== "Altro" && (e as Event & { isTrusted: boolean }).isTrusted) {
      window.clearTimeout(autoTimer);
      autoTimer = window.setTimeout(() => {
        if (current === 0 && validateStep(0)) show(1, 1);
      }, 250);
    }
  });

  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const t = e.target as HTMLElement;
    if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.tagName === "A") return;
    if (current < 2) {
      e.preventDefault();
      if (validateStep(current)) show(current + 1, 1);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (let i = 0; i < 3; i++) {
      if (!validateStep(i)) {
        if (i !== current) show(i, -1);
        return;
      }
    }
    const d = data(form);
    if (d.botcheck) return;
    const payload: Fields = {
      subject: `Nuova richiesta di anteprima: ${d.nome_attivita}`,
      from_name: "Sito Focale",
      botcheck: "",
      attivita: d.attivita === "Altro" && d.attivita_altro ? `Altro: ${d.attivita_altro}` : d.attivita,
      sito: d.sito === "Sì" && d.sito_indirizzo ? `Sì: ${d.sito_indirizzo}` : d.sito,
      nome: d.nome,
      nome_attivita: d.nome_attivita,
      telefono: d.telefono,
      email: d.email || "non indicata",
      zona: d.zona,
      orario: d.orario || "indifferente",
      pacchetto: d.pacchetto || "non indicato",
      fondatori: d.fondatori || "no",
      provenienza: d.provenienza,
      privacy: "accettata",
    };
    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = "Invio in corso...";
    fail.hidden = true;
    const ok = await send(form, payload);
    if (ok) {
      location.href = "/grazie/";
      return;
    }
    submit.disabled = false;
    submit.textContent = original;
    const text = [
      "Ciao, vorrei l'anteprima gratuita del mio nuovo sito.",
      `Attività: ${payload.attivita}.`,
      `Sito attuale: ${payload.sito}.`,
      `Nome: ${payload.nome}.`,
      `Nome dell'attività: ${payload.nome_attivita}.`,
      `Telefono: ${payload.telefono}.`,
      d.email ? `Email: ${d.email}.` : "",
      `Zona: ${payload.zona}.`,
      d.orario ? `Quando contattarmi: ${d.orario}.` : "",
      d.pacchetto ? `Pacchetto: ${d.pacchetto}.` : "",
      d.fondatori ? "Mi interessa un posto fondatori." : "",
    ]
      .filter(Boolean)
      .join("\n");
    failWa.href = waHref(form, text);
    fail.hidden = false;
  });
}

/* ---------------- Contact form ---------------- */
export function initContactForm() {
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  if (!form) return;
  const submit = form.querySelector<HTMLButtonElement>("[data-submit]")!;
  const fail = form.querySelector<HTMLElement>("[data-fail]")!;
  const failWa = form.querySelector<HTMLAnchorElement>("[data-fail-wa]")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = data(form);
    let first: HTMLElement | null = null;
    const check = (name: string, bad: boolean, msg: string) => {
      setError(form, name, bad ? msg : "");
      if (bad && !first) first = form.querySelector<HTMLElement>(`[name="${name}"]`);
    };
    check("nome", !d.nome, MSG.nome);
    check("contatto", !(d.contatto && (isPhone(d.contatto) || isEmail(d.contatto))), MSG.contatto);
    check("messaggio", !d.messaggio, MSG.messaggio);
    check("privacy", !d.privacy, MSG.privacy);
    if (first) {
      (first as HTMLElement).focus();
      return;
    }
    if (d.botcheck) return;
    const payload: Fields = {
      subject: `Nuovo messaggio dal sito: ${d.nome}`,
      from_name: "Sito Focale",
      botcheck: "",
      nome: d.nome,
      contatto: d.contatto,
      messaggio: d.messaggio,
      privacy: "accettata",
    };
    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = "Invio in corso...";
    fail.hidden = true;
    if (await send(form, payload)) {
      location.href = "/grazie/";
      return;
    }
    submit.disabled = false;
    submit.textContent = original;
    failWa.href = waHref(form, `Ciao, sono ${d.nome}. ${d.messaggio}\nMi trovi a: ${d.contatto}.`);
    fail.hidden = false;
  });

  form.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.getAttribute("aria-invalid")) setError(form, t.name, "");
  });
}
