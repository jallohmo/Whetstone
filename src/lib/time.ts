/**
 * Time zone handling for the whole platform.
 *
 * The problem this solves: a `datetime-local` input submits bare wall-clock text
 * ("2026-08-18T09:00") with no zone, and `new Date(string)` interprets that in the
 * RUNTIME's zone — which on Vercel is UTC. So an advisor in Sydney entering 9am
 * had 09:00Z stored: 7pm their time. It looked right on screen only because every
 * Intl.DateTimeFormat in the app also omitted `timeZone` and rendered back in UTC,
 * so the round trip agreed with itself while the underlying instant was wrong for
 * sessions, reminders and the client's booking screen alike.
 *
 * The fix is one declared reference zone for wall-clock times, used on the way in
 * AND on the way out:
 *
 *   - Instants are stored in the database in UTC (unchanged — Postgres timestamps).
 *   - A wall-clock string is interpreted in PLATFORM_TIMEZONE, not the server's.
 *   - Every rendered time is formatted in PLATFORM_TIMEZONE, so what one person
 *     enters is what everyone else reads.
 *
 * NEXT_PUBLIC_ because the availability form needs it client-side to compute "now"
 * for the input's `min`. It is a display/interpretation setting, not a secret.
 */
export const PLATFORM_TIMEZONE =
  process.env.NEXT_PUBLIC_PLATFORM_TIMEZONE || "Australia/Sydney";

const LOCALE = "en-AU";

/**
 * How far `timeZone` is ahead of UTC at a given instant, in milliseconds.
 * Derived from Intl rather than a table, so DST is handled by the runtime's own
 * tz database instead of by us.
 */
export function zoneOffsetMs(at: Date, timeZone: string = PLATFORM_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    // Some runtimes render midnight as hour 24 under hour12:false.
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asIfUtc - at.getTime();
}

/**
 * Turn a `datetime-local` value ("2026-08-18T09:00") into the real instant that
 * wall-clock time refers to in `timeZone`. Returns an Invalid Date for anything
 * unparseable, so callers can keep using Number.isNaN(d.getTime()).
 *
 * The offset is applied twice because the offset itself depends on the instant:
 * the first pass gets us close enough to read the right side of a DST boundary,
 * the second settles it. Only the hour either side of a transition needs the
 * second pass, but it costs nothing.
 */
export function wallClockToUtc(
  wallClock: string,
  timeZone: string = PLATFORM_TIMEZONE,
): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    wallClock.trim(),
  );
  if (!m) return new Date(NaN);

  const [year, month, day, hour, minute, second] = m
    .slice(1)
    .map((v) => (v === undefined ? 0 : Number(v)));

  // Range-check before constructing: Date.UTC silently ROLLS OVER out-of-range
  // components (month 13 becomes January of the next year, 31 April becomes
  // 1 May), so without this a malformed submission would be accepted as some
  // other, arbitrary time rather than rejected.
  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59
  ) {
    return new Date(NaN);
  }

  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(naive)) return new Date(NaN);

  // Catches the rollovers range-checking can't see on its own, e.g. 31 February.
  const check = new Date(naive);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return new Date(NaN);
  }

  let utc = naive;
  for (let i = 0; i < 2; i++) {
    utc = naive - zoneOffsetMs(new Date(utc), timeZone);
  }
  return new Date(utc);
}

/**
 * The inverse: an instant rendered as a `datetime-local` value in `timeZone`.
 * Used for the availability input's `min`, so "now" means the advisor's now
 * rather than the server's.
 */
export function utcToWallClock(
  at: Date,
  timeZone: string = PLATFORM_TIMEZONE,
): string {
  const shifted = new Date(at.getTime() + zoneOffsetMs(at, timeZone));
  return shifted.toISOString().slice(0, 16);
}

/**
 * Build a formatter pinned to the platform zone. Every date rendered anywhere in
 * the app should come through here — an Intl.DateTimeFormat without an explicit
 * `timeZone` silently uses the server's, which is the bug this module exists for.
 */
export function platformFormat(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: PLATFORM_TIMEZONE, ...options });
}

/**
 * The zone's short name at a given instant ("AEST"/"AEDT"), for labelling times
 * that someone might otherwise read in their own zone. Falls back to the IANA
 * name if the runtime won't give a short name.
 */
export function zoneLabel(at: Date = new Date()): string {
  const part = new Intl.DateTimeFormat(LOCALE, {
    timeZone: PLATFORM_TIMEZONE,
    timeZoneName: "short",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? PLATFORM_TIMEZONE;
}
