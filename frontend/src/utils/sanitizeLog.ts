/**
 * Make an untrusted value safe to write to the console/log: serialise objects,
 * strip CR/LF and other control characters (prevents forged log lines) and cap
 * the length.
 */
export function sanitizeForLog(value: unknown, maxLength = 500): string {
  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  // Remove CR/LF first (the log-forging characters), then neutralise any other
  // C0 control characters, DEL and Unicode line/paragraph separators.
  text = text
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
