// Runs once when the server starts: refuse to start in real mode with missing configuration.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("./lib/env-check");
    assertEnv();
  }
}
