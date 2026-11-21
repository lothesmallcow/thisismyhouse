/** Node-side dependencies of the engine: the OS DNS resolver and PSI with the PSI_KEY env var. */
import { promises as dns } from "node:dns";
import type { Resolver } from "../../src/scorer/safe-fetch";

export const nodeResolver: Resolver = async (host) => {
  const all = await dns.lookup(host, { all: true, verbatim: true }).catch(() => []);
  return all.map((a) => a.address);
};
export const psiKey = process.env.PSI_KEY;
