import { headers } from "next/headers";
import { BackLink } from "@/components/back-link";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/server/auth";

export const metadata = { title: "Salva in Compass" };

/**
 * The bookmarklet. On the page the person is looking at (their own click, no automation): the job's
 * schema.org data when the page has it, else the known title/company blocks, else the page title and
 * the selected text. It opens Compass's "Aggiungi" form, filled in, for them to check and save.
 */
function bookmarklet(origin: string): string {
  const js = `(()=>{let t='',c='',l='',d='';try{document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{let j=JSON.parse(s.textContent);[].concat(j['@graph']||j).forEach(o=>{if(o&&o['@type']==='JobPosting'){t=o.title||t;c=(o.hiringOrganization&&o.hiringOrganization.name)||c;const a=[].concat(o.jobLocation||[])[0];l=(a&&a.address&&a.address.addressLocality)||l;d=String(o.description||'').replace(/<[^>]+>/g,' ')}})})}catch(e){}const q=s=>{const e=document.querySelector(s);return e?e.innerText.trim():''};t=t||q('.job-details-jobs-unified-top-card__job-title')||q('.jobsearch-JobInfoHeader-title')||q('h1');c=c||q('.job-details-jobs-unified-top-card__company-name')||q('[data-testid="inlineHeader-companyName"]')||q('[data-company-name]');d=String(window.getSelection()).trim()||d||q('#job-details')||q('.jobs-description__content')||q('#jobDescriptionText')||'';let u=location.href;const m=u.match(/currentJobId=(\\d+)/);if(m)u='https://www.linkedin.com/jobs/view/'+m[1]+'/';const p=new URLSearchParams({url:u,title:t||document.title,company:c,city:l,text:d.replace(/\\s+/g,' ').slice(0,1800)});window.open(${JSON.stringify(origin)}+'/offerte/aggiungi?'+p,'_blank')})()`;
  return `javascript:${encodeURIComponent(js)}`;
}

export default async function SalvaPage() {
  await requireUser();
  const h = await headers();
  const origin = process.env.APP_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const href = bookmarklet(origin.replace(/\/$/, ""));
  // React does not render javascript: links, so the button is plain HTML (our own fixed code).
  const button = `<a href="${href.replace(/"/g, "&quot;")}" class="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-on-primary no-underline" onclick="return false">Salva in Compass</a>`;
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/offerte">Offerte</BackLink>
      <PageHeader title="Salva in Compass" description="Un pulsante nel tuo browser: sei su un annuncio di LinkedIn, Indeed o di qualsiasi sito, un clic e lo ritrovi in Compass con il suo punteggio. Lo usi tu, sulla pagina che stai guardando: niente automatismi, niente rischi per il tuo account." />
      <Card>
        <ol className="list-decimal space-y-3 pl-5 text-[14px]">
          <li>
            Mostra la barra dei preferiti (Ctrl+Shift+B, su Mac Cmd+Shift+B).
          </li>
          <li>
            Trascina questo pulsante nella barra dei preferiti:
            <div className="mt-2" dangerouslySetInnerHTML={{ __html: button }} />
          </li>
          <li>Apri un annuncio che ti interessa e clicca &quot;Salva in Compass&quot; nella barra: si apre Compass con i campi già compilati. Controlla e aggiungi.</li>
          <li className="text-muted">Se un campo è vuoto, seleziona il testo dell&apos;annuncio prima di cliccare: lo leggo dalla selezione.</li>
        </ol>
      </Card>
      <p className="mt-4 text-[13px] text-muted">Da telefono: usa &quot;Condividi → Copia link&quot; e incolla il link in Offerte → Aggiungi a mano.</p>
    </div>
  );
}
