/**
 * Unread-message logic, pure so it can be tested without a database.
 *
 * A thread is "unread" from someone's side when the other party has written
 * since that person last had it open. ThreadRead holds the marker; a missing
 * marker means never opened, so everything from the other side counts.
 *
 * The two rules worth stating, because both are easy to get wrong and neither
 * is visible in a count:
 *
 *  - Your own messages never count. Sending is not receiving, and a badge that
 *    lights up because you replied is worse than no badge.
 *  - No marker means unread from the beginning of the thread, NOT zero. Treating
 *    an absent row as "all read" is the failure that silently hides the very
 *    first message a client ever sends — the one that matters most.
 */

export interface ThreadMarker {
  bookingId: string;
  /** When this viewer last opened the thread; null = never. */
  lastReadAt: Date | null;
}

/**
 * Prisma `where` clauses selecting exactly the messages unread by `viewerId`.
 *
 * Returned as an array for `{ OR: [...] }`. Empty means there is nothing to
 * count — callers must skip the query rather than passing `{ OR: [] }`, which
 * Prisma reads as "match everything" and would report every message in the
 * database as unread.
 */
export function unreadFilters(
  threads: readonly ThreadMarker[],
  viewerId: string,
): { bookingId: string; senderId: { not: string }; createdAt?: { gt: Date } }[] {
  return threads.map((t) => ({
    bookingId: t.bookingId,
    senderId: { not: viewerId },
    // Omitted entirely when never opened, so the clause covers the whole thread.
    ...(t.lastReadAt ? { createdAt: { gt: t.lastReadAt } } : {}),
  }));
}

/** Per-booking counts from a groupBy result, as a map for O(1) lookup. */
export function unreadByBooking(
  rows: readonly { bookingId: string; _count: number }[],
): Map<string, number> {
  return new Map(rows.map((r) => [r.bookingId, r._count]));
}

/**
 * What the bell shows. Counts above `cap` render as "99+" — a four-digit badge
 * breaks the header layout, and the exact number stops being information long
 * before then.
 */
export function badgeLabel(count: number, cap = 99): string | null {
  if (count <= 0) return null;
  return count > cap ? `${cap}+` : String(count);
}

/** Accessible name for the bell — a bare dot tells a screen reader nothing. */
export function bellLabel(count: number): string {
  if (count <= 0) return "Messages — nothing unread";
  return `Messages — ${count} unread message${count === 1 ? "" : "s"}`;
}
