// Cheap structural check for uploaded CVs: a real PDF starts with "%PDF-" and ends with an
// "%%EOF" marker (allowing trailing whitespace/incremental-update bytes near the end).
// It does not parse the file; a renamed Word or image file is rejected.
export function looksLikePdf(buf: Uint8Array): boolean {
  if (buf.length < 16) return false;
  const head = Buffer.from(buf.subarray(0, 5)).toString("latin1");
  const tail = Buffer.from(buf.subarray(Math.max(0, buf.length - 1024))).toString("latin1");
  return head === "%PDF-" && tail.includes("%%EOF");
}
