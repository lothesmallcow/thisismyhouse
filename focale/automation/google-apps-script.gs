/**
 * Focale: request log.
 * A Google Apps Script web app that receives the JSON the site's forms send, appends a row to
 * the sheet "Richieste" and emails a short summary. Setup steps in automation/README.md.
 */

const SHEET_NAME = "Richieste";
// Where the summary email goes. Leave empty to use the account that owns the script.
const NOTIFY_EMAIL = "";
// Field order for the columns. Unknown fields are added at the end automatically.
const FIELDS = [
  "subject", "attivita", "sito", "nome", "nome_attivita", "telefono", "email", "zona", "orario",
  "pacchetto", "fondatori", "provenienza", "contatto", "messaggio",
];
const MAX_LEN = 2000;

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(body);

    // Spam trap: real visitors never fill the hidden "botcheck" field.
    if (data.botcheck) return json_({ ok: true });

    const clean = {};
    Object.keys(data).forEach(function (k) {
      if (k === "access_key" || k === "botcheck" || k === "from_name") return;
      if (!/^[a-z_]{1,40}$/.test(k)) return;
      clean[k] = String(data[k] == null ? "" : data[k]).slice(0, MAX_LEN);
    });
    if (!clean.nome && !clean.nome_attivita && !clean.messaggio) return json_({ ok: false, error: "empty" });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      const headers = ensureHeaders_(sheet, Object.keys(clean));
      const row = headers.map(function (h) {
        if (h === "ricevuto") return new Date();
        const v = clean[h] || "";
        // Stop formula injection when the sheet is opened.
        return /^[=+\-@]/.test(v) ? "'" + v : v;
      });
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    notify_(clean);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: "Focale request log" });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet, keys) {
  let headers = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  if (headers.length === 0) {
    headers = ["ricevuto"].concat(FIELDS);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  const missing = keys.filter(function (k) { return headers.indexOf(k) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  return headers;
}

function notify_(d) {
  const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const title = d.subject || "Nuova richiesta dal sito";
  const lines = Object.keys(d)
    .filter(function (k) { return k !== "subject"; })
    .map(function (k) { return k + ": " + d[k]; });
  MailApp.sendEmail(to, title, lines.join("\n") + "\n\nRegistrata nel foglio \"" + SHEET_NAME + "\".");
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
