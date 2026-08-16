/**
 * Sanitise a post-auth "?next=" destination.
 *
 * `next` reaches the auth actions from a query string, so an unchecked value is
 * an open redirect: /login?next=https://evil.com would bounce a freshly
 * authenticated user off-site. Only same-site absolute paths are accepted;
 * anything else returns null so the caller falls back to the role's home.
 *
 * Lives in its own module (rather than inside the "use server" auth actions) so
 * it can be unit tested directly — every export of a "use server" file must be an
 * async server action, which a pure string guard should not be.
 */
export function safeNext(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/")) return null;
  // "//evil.com" is protocol-relative and "/\evil.com" is normalised to it by
  // some parsers — both leave the site despite starting with a slash.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
