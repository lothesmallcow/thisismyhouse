export function CvTips() {
  const tips = [
    "Niente codice fiscale né indirizzo completo: basta la città.",
    "Telefono ed e-mail che usi per le candidature.",
    "In fondo la frase sulla privacy: “Autorizzo il trattamento dei miei dati personali ai sensi del Reg. UE 2016/679 (GDPR).”",
    "File PDF, al massimo 2 MB.",
  ];
  return (
    <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-muted">
      {tips.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
