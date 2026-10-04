import { IconCheck } from "./icons";

export function CvTips() {
  const tips = [
    "Non mettere il codice fiscale né l'indirizzo di casa completo: basta la città.",
    "Metti telefono ed e-mail della ricerca di lavoro.",
    "In fondo aggiungi la frase sulla privacy: “Autorizzo il trattamento dei miei dati personali ai sensi del Reg. UE 2016/679 (GDPR).”",
    "Salva il file come PDF.",
  ];
  return (
    <ul className="space-y-2 rounded-2xl bg-navy-soft/60 p-4">
      {tips.map((t) => (
        <li key={t} className="flex gap-2.5">
          <IconCheck className="mt-0.5 shrink-0 text-navy" size={22} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
