// Demo forms: stepped, validated, and they only compose a WhatsApp message prefixed "[DEMO] ".
// Nothing is sent anywhere else.
export function initDemoForms() {
  document.querySelectorAll<HTMLFormElement>("[data-demo-form]").forEach((form) => {
    const steps = Array.from(form.querySelectorAll<HTMLElement>("[data-dstep]"));
    const progress = form.querySelector<HTMLElement>("[data-dprogress]");
    const number = form.dataset.wa ?? "";
    const heading = () => form.dataset[`heading${document.documentElement.lang === "en" ? "En" : ""}`] ?? form.dataset.heading ?? "";
    let current = 0;
    if (steps.length > 1) {
      form.classList.add("is-steps");
      steps.forEach((s, i) => s.classList.toggle("is-current", i === 0));
    }
    const msgFor = (key: string) => form.dataset[`err${document.documentElement.lang === "en" ? "En" : ""}`] ?? form.dataset.err ?? key;

    const validate = (i: number) => {
      const scope = steps.length > 1 ? steps[i] : form;
      let ok = true;
      scope.querySelectorAll<HTMLInputElement>("[required]").forEach((el) => {
        const group = el.type === "radio" ? scope.querySelectorAll<HTMLInputElement>(`[name="${el.name}"]`) : null;
        const filled = group ? Array.from(group).some((g) => g.checked) : el.value.trim() !== "";
        const err = scope.querySelector<HTMLElement>(`[data-derr="${el.name}"]`);
        if (err) err.textContent = filled ? "" : msgFor(el.name);
        if (!filled && ok) {
          ok = false;
          el.focus();
        }
        if (!group) el.toggleAttribute("aria-invalid", !filled);
      });
      return ok;
    };
    const go = (n: number) => {
      steps[current].classList.remove("is-current");
      steps[n].classList.add("is-current");
      current = n;
      if (progress) progress.textContent = (progress.dataset[`tpl${document.documentElement.lang === "en" ? "En" : ""}`] ?? progress.dataset.tpl ?? "").replace("{n}", String(n + 1));
      steps[n].querySelector<HTMLElement>("legend, [data-dfocus]")?.focus();
    };
    form.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-dnext]") && validate(current)) go(current + 1);
      if (t.closest("[data-dback]")) go(current - 1);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate(steps.length > 1 ? current : 0)) return;
      const lines: string[] = [];
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-label]").forEach((el) => {
        if (el instanceof HTMLInputElement && el.type === "radio" && !el.checked) return;
        const v = el instanceof HTMLSelectElement ? el.options[el.selectedIndex]?.text ?? "" : el.dataset.pretty ?? el.value;
        const value = el instanceof HTMLInputElement && el.type === "date" && el.value ? new Date(el.value + "T12:00:00").toLocaleDateString(document.documentElement.lang === "en" ? "en-GB" : "it-IT", { day: "numeric", month: "long" }) : v;
        if (!value.trim()) return;
        const label = el.dataset[`label${document.documentElement.lang === "en" ? "En" : ""}`] ?? el.dataset.label;
        lines.push(`${label}: ${value.trim()}.`);
      });
      const text = `[DEMO] ${heading()}. ${lines.join(" ")}`;
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    });
  });
}
