// Scheduled jobs over HTTP for the host's cron (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
// Responses contain counts only, never personal data.
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { JOB_NAMES, runJob, type JobName } from "@/lib/pipeline/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function handle(req: Request, ctx: { params: Promise<{ job: string }> }) {
  if (!authorized(req)) return Response.json({ ok: false }, { status: 401 });
  const { job } = await ctx.params;
  if (!JOB_NAMES.includes(job as JobName)) return Response.json({ ok: false }, { status: 404 });
  try {
    const result = await runJob(getDb(), job as JobName);
    return Response.json({ ok: true, result: JSON.parse(JSON.stringify(result, (k, v) => (typeof v === "string" && v.includes("@") ? "[redacted]" : v))) });
  } catch {
    return Response.json({ ok: false, error: "job failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
