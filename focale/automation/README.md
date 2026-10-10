# Request log in Google Sheets (optional)

The site's forms always send requests by email through Web3Forms. This optional Google Apps
Script also writes every request as a row in a Google Sheet and emails you a short summary.
It's the same small automation Focale sells, running on Focale's own site.

## Setup (about 5 minutes)

1. Create a new Google Sheet (any name, for example "Focale richieste").
2. In the sheet: **Extensions > Apps Script**.
3. Delete the sample code, paste the whole content of `google-apps-script.gs`, save.
4. Optional: set `NOTIFY_EMAIL` at the top if the summary should go to an address other than
   the Google account that owns the sheet.
5. **Deploy > New deployment**. Type: **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Authorise when Google asks (it needs access to this sheet and to send email as you).
7. Copy the web app URL (it ends in `/exec`).
8. Put it in the environment variable `PUBLIC_SHEETS_ENDPOINT` (in `.env` locally and in the
   Cloudflare Pages project settings), then rebuild and redeploy.

The first request creates the "Richieste" tab and the header row.

## How it behaves

- The site posts the same JSON it sends to Web3Forms (`mode: "no-cors"`, fire and forget), so
  a problem with the sheet never blocks the visitor.
- Requests with the hidden `botcheck` field filled are ignored (spam).
- Field names are validated, values are capped at 2,000 characters and cells that start with
  `=`, `+`, `-` or `@` are escaped, so nobody can inject a formula into your sheet.
- `LockService` prevents two simultaneous requests from overwriting each other.

## Privacy

If you turn this on, Google processes the requests: the privacy notice (`/privacy`) already
lists Google for this purpose. Delete rows older than 12 months for requests that didn't
become work, as the notice promises.

## Testing

Open the `/exec` URL in a browser: it should answer `{"ok":true,"service":"Focale request log"}`.
Then send a test request from the site and check the sheet and your inbox.
