// Right after the questionnaire: the plans, then the last page. Free is always one click away.
import Link from "next/link";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/server/plans";
import { PlanCards } from "@/components/plan-cards";

export const metadata = { title: "Scegli il piano" };

export default async function PianiPage() {
  const user = await requireUser();
  const plan = await getPlan(getDb(), user.id);
  return (
    <div className="py-4">
      <div className="hero mb-6 rounded-[var(--radius-card)] px-5 py-6 shadow-[var(--shadow-card)]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/80">Ultimo passo</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em]">Scegli come usare Compass</h1>
        <p className="mt-1.5 text-[14.5px] text-white/85">Free va benissimo per iniziare. Plus e Premium danno più ricerche e, presto, l&apos;assistente AI. Ora sono in prova gratuita.</p>
      </div>
      <PlanCards current={plan.key} back="/benvenuto/fine" onboarding />
      <p className="mt-6 text-center text-[14px]">
        <Link href="/benvenuto/fine">Decido dopo →</Link>
      </p>
    </div>
  );
}
