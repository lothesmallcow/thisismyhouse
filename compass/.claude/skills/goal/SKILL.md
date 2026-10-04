---
name: goal
description: Autonomous build mode. Makes finishing the app or site in the spec (or in the arguments) the top priority and keeps working, without stopping, until it is done and verified. Pauses only for permissions, credentials, real-world actions or genuine decisions. Use only when the user types /goal.
argument-hint: "[goal text or spec file] | pause | status"
disable-model-invocation: true
---

# /goal: finish the build, don't stop

Arguments: $ARGUMENTS

- `pause`: write `PAUSED` as the first line of `.goal/STATUS`, summarize where things stand in 5 lines, stop. Do nothing else.
- `status`: summarize `.goal/PROGRESS.md` in 5 lines. Change nothing. Stop.
- anything else, or empty: start or resume the goal (below).

## Core rules (re-read these after every compaction)

1. **One objective:** finish the goal completely and verifiably. A Stop hook sends you back to work while `.goal/STATUS` says `ACTIVE`. Don't end a turn after finishing one item; move to the next.
2. **You may stop only by first writing one of these as the first line of `.goal/STATUS`, with the reason logged in `.goal/PROGRESS.md`:**
   - `DONE`: every Definition of Done item is checked AND verified.
   - `BLOCKED`: every remaining item depends on the user (a permission, a credential, a real-world action, a decision only they can make).
   - `PAUSED`: the user asked you to stop or pause.
3. **"Perfect" means verified, not claimed.** An item is done only when you ran it and saw it work: tests pass, the app starts, the feature behaves correctly when exercised for real (UI rendered and clicked through, endpoint called, job run).
4. **Never fake progress.** Never delete, skip or weaken a test to make it pass. Never hardcode outputs, stub a feature and mark it done, leave TODOs in a "done" item, mock a production code path to get green, or say something works without running it. If you can't make something work, log it honestly and move on.
5. **The spec's hard rules beat the goal.** If finishing an item would mean breaking one (a forbidden data source, evading a block, spending money, sending real messages, publishing private data), don't. Log it under "Waiting on you" and continue with other work.

## Permission points: always ask the user first

- `git push`, creating or changing a remote repository, making anything public
- deploying, or creating accounts on any hosting or third-party service
- spending money, entering billing details, adding any paid service or API key that needs a card
- sending real emails or messages, or any action that reaches a real person
- live requests to any data source the spec puts in an approval-required tier
- deleting anything outside the project folder, or deleting user data
- anything irreversible

Never ask the user to paste secrets into chat. Tell them which variable to set in `.env` and why.

**How to handle user-dependent items:** add them to "Waiting on you" in `PROGRESS.md` and keep working on everything else, using demo mode, fixtures and mocks *in tests only*. Ask immediately (AskUserQuestion) only for a decision that would force a large rewrite if guessed wrong. Otherwise choose the spec's default or the safest reasonable option, record it as a decision (ADR if the project has `docs/adr/`), list it under "Waiting on you" for confirmation, and continue. Set `BLOCKED` only when nothing else is left.

## Start or resume

1. **Find the goal:** `$ARGUMENTS` if it's text or a file path; otherwise the first of `BRIEF.md`, `SPEC.md`, `CLAUDE.md`, `README.md` in the project root. If none exists, ask one question to get the goal.
2. **Resume** if `.goal/PROGRESS.md` exists: read it, re-read the spec, check `git log --oneline -20`, continue from the first unchecked item.
3. **Otherwise create** `.goal/PROGRESS.md` (format below). Build the Definition of Done from the spec's requirements and acceptance criteria; every item must be checkable by running something.
4. Write `ACTIVE` to `.goal/STATUS` and `0` to `.goal/continuations`. Make sure `.goal/` is in `.gitignore`. Initialize git locally if the project has none.
5. If the spec says to "stop and show me" after milestones, treat those under /goal as **checkpoints**: write a checkpoint summary in `PROGRESS.md` and keep going. Only the permission points above stop you.

## PROGRESS.md format

```
# Goal
<one paragraph>  Spec: <path>

## Definition of Done
- [ ] <requirement from the spec, phrased so it can be verified>
- [ ] Tests, lint and typecheck pass
- [ ] Builds and runs from a clean checkout with the documented command
- [ ] Every user-facing feature exercised in the running app
- [ ] README up to date (setup, usage, architecture)

## Plan
- [ ] <ordered steps; user-visible core first>

## Waiting on you
- <permission / credential / decision needed, and what it unblocks>

## Decisions
- <decision, why, how to reverse>

## Log
- <YYYY-MM-DD HH:MM> <what was done> | verified by <how> | <commit>
```

## Work loop

1. Take the next unchecked Plan item whose dependencies are met.
2. Implement it in small steps.
3. Verify for real: tests, typecheck, lint, then run the app and exercise the feature (use `/verify` or `/run` if available, or a script or headless browser).
4. If it fails, fix and re-verify. After 3 failed attempts with the same approach, change approach or read the docs. Still stuck: log it, move to another item, come back later.
5. Commit locally with a clear message.
6. Update `PROGRESS.md`: tick the item, add one short log line.
7. Go to step 1.

## Context hygiene

- `PROGRESS.md` is the source of truth. After a compaction or in a new session, re-read it and the spec before doing anything else.
- Keep log lines short. Don't paste huge outputs into the conversation. Use subagents for wide searches across the codebase.

## Finishing

1. Fresh install, full test suite, build, start the app, and smoke-test every Definition of Done item.
2. Have a subagent that didn't write the code review the running app against the Definition of Done. Fix what it finds.
3. Write `DONE` to `.goal/STATUS`, then report in plain language: what was built, how it was verified, what is waiting on the user, and how to run it.

## If the user talks to you mid-goal

- "stop" / "pause": write `PAUSED`, summarize, stop.
- A question or a change request: answer or apply it, update `PROGRESS.md` if the plan changed, then keep working. `STATUS` stays `ACTIVE`.
