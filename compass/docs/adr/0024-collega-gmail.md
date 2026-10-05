# 0024 · "Collega Gmail": read each person's own Gmail (alerts only) instead of forwarding

## Context

Getting the job alerts to Compass by forwarding took a dozen steps per person: copy a personal
address, add it as a Gmail forwarding address, fetch the confirmation code, verify, keep forwarding
off, import a filter. It also failed outright when the person's Gmail was the Compass mailbox itself
("you can't forward to your own address"), and it routed everyone's alerts through one shared mailbox.

## Options

1. **Forwarding** (as before): no Google project, but long, error-prone, one shared mailbox.
2. **IMAP with each person's app password**: short for us, but asks people for a credential with full
   access to their mailbox, needs 2-step verification, and Google discourages it.
3. **Google sign-in + Gmail API, `gmail.readonly`** (chosen): two clicks for the person, no password,
   revocable from Google, and Compass can ask Gmail for the alert senders only (server-side search),
   so the rest of the mailbox is never downloaded.
4. Microsoft Graph for Outlook: same idea, later (forwarding still covers Outlook and other providers).

## Decision

Option 3. `gmail.readonly` is a Google "restricted" scope: published but unverified, the app shows
Google's "unverified app" screen and at most 100 people can connect (fine while Compass is
invite-only); beyond that, Google's verification and a yearly CASA assessment. The "Testing" status
is not used: its tokens expire after 7 days.

- Only `from:(<alert senders>) after:<date>` is requested; raw messages go through the same parser and
  routing as the mailbox (alerts private to that person, Message-IDs processed once).
- The refresh token is encrypted at rest (AES-256-GCM, key derived from `SESSION_SECRET`); never logged,
  never in error messages. A revoked access is marked and the page asks to connect again.
- "Scollega Gmail", "Cancella tutti i miei dati" and account deletion revoke the access at Google.
- The first read covers the last 30 days, so alerts people already receive count at once.
- Forwarding stays for Outlook, other providers and people who prefer not to grant access.
