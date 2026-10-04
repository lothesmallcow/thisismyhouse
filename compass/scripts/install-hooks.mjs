// Installs scripts/pre-commit.sh as the git pre-commit hook.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const gitDir = execSync("git rev-parse --git-common-dir", { encoding: "utf8" }).trim();
const hook = path.join(gitDir, "hooks", "pre-commit");
const script = path.resolve("scripts/pre-commit.sh");
fs.mkdirSync(path.dirname(hook), { recursive: true });
fs.writeFileSync(hook, `#!/usr/bin/env bash\nexec "${script}"\n`, { mode: 0o755 });
console.log(`pre-commit hook installed at ${hook}`);
