// Demo/audit helper: records a rejected mailbox password, to show what the admin sees.
import "./load-env";
import { getDb } from "../src/lib/db";
import { runWithHealth } from "../src/lib/pipeline/health";

await runWithHealth(getDb(), "mailbox", async () => {
  throw new Error("Invalid credentials (Failure) [AUTHENTICATIONFAILED]");
});
console.log("mailbox failure recorded");
