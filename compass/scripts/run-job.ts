// CLI entry for scheduled jobs (used by GitHub Actions cron and by hand).
// Usage: tsx scripts/run-job.ts <ingest|discover|queue|replies|digest|sweep|index|metrics>
import "./load-env";
import { getDb } from "../src/lib/db";
import { assertEnv } from "../src/lib/env-check";
import { JOB_NAMES, runJob, type JobName } from "../src/lib/pipeline/jobs";

const name = process.argv[2] as JobName;
if (!JOB_NAMES.includes(name)) {
  console.error(`usage: run-job <${JOB_NAMES.join("|")}>`);
  process.exit(1);
}
try {
  assertEnv();
  const result = await runJob(getDb(), name);
  // Only counts are printed: CI logs are public, so no personal data ever goes to stdout.
  console.log(JSON.stringify(result, (k, v) => (typeof v === "string" && v.includes("@") ? "[redacted]" : v)));
} catch (e) {
  console.error(`Job ${name} failed: ${e instanceof Error ? e.message.replace(/[\w.+-]+@[\w.-]+/g, "[e-mail]") : "error"}`);
  process.exit(1);
}
