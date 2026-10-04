// Minimal robots.txt parser (User-agent groups, Allow/Disallow, longest match wins, "*" and "$").
export interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelay: number | null;
}

export function parseRobots(txt: string, agent = "compassjobfinder"): RobotsRules {
  const groups: { agents: string[]; allow: string[]; disallow: string[]; delay: number | null }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], allow: [], disallow: [], delay: null };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === "allow" && val) cur.allow.push(val);
    if (key === "disallow" && val) cur.disallow.push(val);
    if (key === "crawl-delay" && Number(val) > 0) cur.delay = Number(val);
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== "*" && agent.includes(a))) ?? groups.find((g) => g.agents.includes("*"));
  return { allow: mine?.allow ?? [], disallow: mine?.disallow ?? [], crawlDelay: mine?.delay ?? null };
}

function toRegex(pattern: string): RegExp {
  const esc = pattern.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + (esc.endsWith("\\$") ? esc.slice(0, -2) + "$" : esc));
}

export function isAllowed(rules: RobotsRules, pathAndQuery: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const [list, allow] of [[rules.allow, true], [rules.disallow, false]] as const) {
    for (const p of list) {
      if (toRegex(p).test(pathAndQuery) && (!best || p.length > best.len || (p.length === best.len && allow))) best = { len: p.length, allow };
    }
  }
  return best ? best.allow : true;
}
