/**
 * Return a same-origin, relative path that is safe to pass to router.push /
 * router.replace, or `fallback` when the candidate is missing or unsafe.
 *
 * Only paths beginning with a single "/" are accepted. Protocol-relative URLs
 * ("//evil.com"), backslash tricks ("/\\evil.com"), absolute URLs and
 * javascript:/data: URLs are rejected, which prevents open redirects and
 * script injection through a `returnUrl` query parameter.
 */
export function safeReturnUrl(candidate: unknown, fallback: string): string {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  // Reject control characters, whitespace and backslashes that browsers may
  // strip or normalise into a different origin.
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f || ch === '\\') {
      return fallback;
    }
  }
  return value;
}
