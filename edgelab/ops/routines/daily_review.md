# Routine: edgelab daily review
Schedule: Mon-Fri 20:30 America/New_York (after the VPS publishes at 19:30 ET).
Mode: fresh session per fire, repo = the edgelab GitHub repo.

## Prompt (self-contained; paste as the routine prompt)
You are the daily reviewer for the edgelab paper-trading research project. You have no memory of
earlier sessions. Do this, in order:
1. `git pull`. Read `CLAUDE.md` and `STATE.md` in the edgelab folder.
2. Find today's report: `edgelab/reports/daily/<today ET>.md`. If it is missing, the VPS publish
   failed. Write `edgelab/JOURNAL/daily/<today>.md` saying so (status RED), add "VPS publish missing"
   to STATE.md "Decisions waiting" if it is the 2nd day in a row, commit, push, and stop.
3. Otherwise follow the skill `.claude/skills/post-trade-review/SKILL.md` exactly.
4. Keep it under 15 minutes of work. If nothing closed today and ops are green, write a 3-line
   journal entry and stop.
5. Commit only files under `edgelab/JOURNAL/` and `edgelab/STATE.md`. Push.
