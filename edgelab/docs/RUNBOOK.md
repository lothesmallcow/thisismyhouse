# Lorenzo's runbook: exactly what to do, when, how

Total hands-on time to get live: about 2 hours, spread over 3-4 days. Steady state after that:
30-60 minutes a week.

## Decide first (5 minutes, today)

**A. Accounts while you are 17.**
Alpaca and Hetzner require 18+ in their terms. You turn 18 on 22 Nov 2026.

| Option | What it means | Trade-off |
|---|---|---|
| 1. Parent holds the accounts (recommended) | A parent signs up for Hetzner (they pay about €8/month) and for the Alpaca *paper* account. Paper is free, no money, no KYC. On 22 Nov you open your own Alpaca paper account and swap the keys in `.env` (5 minutes). | You start now. |
| 2. Wait until 22 Nov | | Loses 7 weeks of forward data, which is the scarcest thing in this project. |
| 3. Sign up yourself anyway | | Not recommended: breaches their terms, and they can close the account. |

**B. Repo.**
Create a new **private** GitHub repo called `edgelab` (empty, no README), then tell me
"repo created". I move the code there with full history.

Why not leave it where it is:
- `thisismyhouse` is your calendar app's GitHub Pages repo.
- The VPS will push data into the repo every evening, which would mean rebuilding your website
  daily. That's messy.

## Step 1: accounts (about 40 minutes, any day this week)

1. **SSH key on your laptop** (if you have none). Run in Terminal (Mac) or PowerShell (Windows):
   `ssh-keygen -t ed25519` and press Enter through the prompts.
   Your public key is in `~/.ssh/id_ed25519.pub`.
2. **Hetzner Cloud** (hetzner.com/cloud, parent as customer):
   1. Create a project `edgelab`.
   2. Security → SSH keys → paste your `.pub`.
   3. Add Server with these settings:
      - Location: Falkenstein or Nuremberg
      - Image: Ubuntu 24.04
      - Type: Shared vCPU, x86, **CX23** (or the cheapest with ≥4 GB RAM; check specs at order)
      - Networking: IPv4 on
      - SSH key: yours
      - **Backups: ON** (+20%)
      - Name: `edgelab-1`
   4. Note the IP.
   - Expect about €6.70/month with VAT, plus about €1.30 backups. Verify at checkout (price confidence 75%).
3. **Alpaca paper** (alpaca.markets, parent's email for now):
   1. Sign up and open the **Paper** dashboard.
   2. API Keys → Generate.
   3. Copy the Key ID and Secret. The secret is shown once; put it in a password manager.
4. **healthchecks.io** (free):
   1. Add a check named `edgelab-health`, period **15 min**, grace **30 min**.
   2. Copy its ping URL (`https://hc-ping.com/...`).
   3. Integrations: email is on by default. Optionally add ntfy (step 5 topic).
5. **ntfy app** on your phone (iOS/Android, free). You subscribe to your topic in step 2 below.

## Step 2: server setup (about 30 minutes)

From your laptop: `ssh root@<IP>`. Then paste this block. It creates the app user, a deploy key and
the clone. Replace `<REPO>` with `edgelab`, or `thisismyhouse` if you chose to stay.

```bash
adduser --disabled-password --gecos "" edgelab
apt-get update && apt-get install -y git
sudo -u edgelab ssh-keygen -t ed25519 -N "" -f /home/edgelab/.ssh/id_ed25519 -C edgelab-vps
cat /home/edgelab/.ssh/id_ed25519.pub
```

On GitHub: repo → Settings → Deploy keys → Add deploy key → paste the printed key → tick
**Allow write access** → Add. Then back on the server:

```bash
sudo -u edgelab bash -c 'ssh-keyscan github.com >> ~/.ssh/known_hosts && git clone git@github.com:lothesmallcow/<REPO>.git ~/<REPO>'
bash /home/edgelab/<REPO>/edgelab/deploy/setup_vps.sh     # if repo is 'edgelab' and code is at root: /home/edgelab/edgelab/deploy/setup_vps.sh
```

The script prints your **ntfy topic**. Subscribe to it in the phone app now.

Then fill in the keys:

```bash
nano /home/edgelab/<REPO>/edgelab/.env
```

Fill in:
- `EDGELAB_SEC_UA` (your name and email)
- `ALPACA_API_KEY` and `ALPACA_SECRET_KEY`
- `EDGELAB_HC_URL`

Save with Ctrl+O, Enter, then exit with Ctrl+X.

## Step 3: smoke test (5 minutes, then send me the output)

```bash
sudo -u edgelab /home/edgelab/<REPO>/edgelab/deploy/run.sh smoke
```

Copy the whole output into our chat. Expect 1-3 FAILs on first contact: the build sandbox could not
reach SEC or Alpaca, so this is their first real test. I fix them, you `git pull` and re-run.

**Faster option (my recommendation):** install Claude Code on the VPS and log in with your plan.
Then I debug directly on the box instead of you copy-pasting:

```bash
sudo -u edgelab bash -c 'curl -fsSL https://claude.ai/install.sh | bash'
sudo -iu edgelab claude      # then: "read CLAUDE.md, run smoke, fix failures, run the initial backfill"
```

This is ordinary interactive Claude Code use. Verify the install command on code.claude.com first.
Confidence 80% that it is current.

## Step 4: backfill and start (10 minutes of yours, about 1 hour of machine time)

```bash
sudo -u edgelab /home/edgelab/<REPO>/edgelab/deploy/initial_backfill.sh
bash /home/edgelab/<REPO>/edgelab/deploy/start_timers.sh
sudo -u edgelab /home/edgelab/<REPO>/edgelab/deploy/run.sh alert-test   # your phone must buzz
```

Then **test the dead-man switch**: `poweroff` the server from the Hetzner console, confirm
healthchecks emails you within about 45 minutes, and power it back on. Do this once; it is part of
the Phase 1 gate.

The Phase 1 clock (14 days, zero silent gaps) starts when the timers start.

## Calendar (low confidence on later dates, about 50%)

| When | What | Who |
|---|---|---|
| this week | Decisions A/B, steps 1-4 | you (~2h) + me |
| +2 days after smoke | smoke fixes, timers on, Phase 1 clock starts | me |
| ~2 weeks later | Phase 1 gate review (one page) | me writes, you approve |
| Oct-Nov | Phase 2: Form 4 / 13D / 8-K parsers, 2016+ history, discovery, then ONE validation run per hypothesis | me |
| 22 Nov | You turn 18: your own Alpaca paper account, swap keys | you (10 min) |
| late Nov-Dec | Gate: promote survivors (if any) to forward test | you approve |
| Feb-Mar 2027 | First verdict | me writes, skeptic agent attacks it, you read |

## Your weekly routine (30-60 minutes, Sunday)
1. Read `JOURNAL/weekly/<date>.md` (the weekly strategist writes it).
2. Open `STATE.md` → "Decisions waiting". Answer each with yes, no, or a question, in the chat or by
   editing the file.
3. Skim `docs/LEARN.md` for one concept a week.

## When something breaks
- **Phone alert "health: PROBLEMS"**: no action needed unless it repeats. The weekly review covers it.
- **Alert "KILL SWITCH"**: nothing trades until it is cleared. Tell me; don't clear it yourself
  without knowing why.
- **Emergency stop of everything:** `sudo -u edgelab <path>/deploy/run.sh kill --reason "manual"`
- **Server dead:** Hetzner console → Power on. Data is safe on disk and in nightly backups.

## Costs
- Hetzner: about €8/month with VAT and backups.
- Everything else is free.
- No Anthropic API spend until an LLM-sensor hypothesis is approved. That would be pay-per-use on
  an API key, because subscription credentials are only for ordinary Claude Code use. Expect about
  $2-10/month with Haiku plus the Batch API. I'll get an exact estimate before asking you.
