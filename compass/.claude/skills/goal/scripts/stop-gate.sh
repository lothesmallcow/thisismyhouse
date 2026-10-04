#!/usr/bin/env bash
# Stop gate for the /goal skill.
#
# Claude Code runs this every time Claude tries to end its turn (Stop hook).
#   - .goal/STATUS first line is ACTIVE  -> block the stop, send Claude back to work
#   - DONE, BLOCKED, PAUSED, or no file  -> allow the stop
# A counter caps automatic continuations (default 50, override with the
# GOAL_MAX_CONTINUATIONS env var) so a confused run can't loop forever.

cat >/dev/null 2>&1 # drain the hook input JSON on stdin (not needed)

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
DIR="$ROOT/.goal"
STATUS_FILE="$DIR/STATUS"
COUNT_FILE="$DIR/continuations"
MAX="${GOAL_MAX_CONTINUATIONS:-50}"

# No goal in this project: do nothing.
[ -f "$STATUS_FILE" ] || exit 0

STATUS="$(head -n 1 "$STATUS_FILE" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')"
[ "$STATUS" = "ACTIVE" ] || exit 0

COUNT=0
if [ -f "$COUNT_FILE" ]; then
  COUNT="$(tr -dc '0-9' <"$COUNT_FILE")"
  [ -n "$COUNT" ] || COUNT=0
fi
COUNT=$((COUNT + 1))
printf '%s\n' "$COUNT" >"$COUNT_FILE"

if [ "$COUNT" -gt "$MAX" ]; then
  printf 'PAUSED\n' >"$STATUS_FILE"
  printf '{"systemMessage":"/goal paused after %s automatic continuations. Check .goal/PROGRESS.md, then type /goal to resume."}\n' "$MAX"
  exit 0
fi

printf '{"decision":"block","reason":"/goal is still ACTIVE (automatic continuation %s of %s). Re-read .goal/PROGRESS.md, take the next unchecked item and keep working. You may stop only after writing DONE (every Definition of Done item verified), BLOCKED (everything left needs the user) or PAUSED (the user asked) as the first line of .goal/STATUS, with the reason logged in .goal/PROGRESS.md."}\n' "$COUNT" "$MAX"
exit 0
