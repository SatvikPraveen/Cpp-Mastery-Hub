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
  text = Array.from(text, (ch) => (isUnsafeLogChar(ch.charCodeAt(0)) ? ' ' : ch)).join('');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function isUnsafeLogChar(code: number): boolean {
  // C0 controls (incl. CR/LF), DEL, and Unicode line/paragraph separators.
  return code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029;
}
