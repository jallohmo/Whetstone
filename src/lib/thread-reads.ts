import "server-only";
import { prisma } from "@/lib/prisma";
import { unreadFilters, unreadByBooking, type ThreadMarker } from "@/lib/unread";

/**
 * Server-side unread queries for the message bell and the advisor inbox.
 *
 * server-only, and deliberately NOT in a "use server" module: every export of
 * one is a callable server action, and `markThreadRead(bookingId, userId)` with
 * a caller-supplied userId would let any visitor mark anyone's thread read. The
 * only callers are server components that have already authorized the viewer.
 */

/** Bookings this user is a party to, with their read marker for each. */
async function markersFor(userId: string): Promise<ThreadMarker[]> {
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ customer: { userId } }, { advisor: { userId } }] },
    select: {
      id: true,
      threadReads: { where: { userId }, select: { lastReadAt: true } },
    },
  });
  return bookings.map((b) => ({
    bookingId: b.id,
    lastReadAt: b.threadReads[0]?.lastReadAt ?? null,
  }));
}

/** Total unread across every thread this user is in — the number on the bell. */
export async function unreadTotal(userId: string): Promise<number> {
  const filters = unreadFilters(await markersFor(userId), userId);
  // `{ OR: [] }` matches everything in Prisma, so an empty filter set must never
  // reach the query — it would report the whole message table as unread.
  if (filters.length === 0) return 0;
  return prisma.message.count({ where: { OR: filters } });
}

/** Unread count per booking, for badging rows in the inbox. */
export async function unreadCounts(userId: string): Promise<Map<string, number>> {
  const filters = unreadFilters(await markersFor(userId), userId);
  if (filters.length === 0) return new Map();

  const rows = await prisma.message.groupBy({
    by: ["bookingId"],
    where: { OR: filters },
    _count: { _all: true },
  });
  return unreadByBooking(rows.map((r) => ({ bookingId: r.bookingId, _count: r._count._all })));
}

/**
 * Record that this user has the thread open, as of now.
 *
 * Called from the thread page's render. Authorization is the caller's job — the
 * page has already resolved the booking through getAuthorizedBooking, so a
 * viewer who isn't a party never reaches this.
 */
export async function markThreadRead(bookingId: string, userId: string): Promise<void> {
  const now = new Date();
  await prisma.threadRead.upsert({
    where: { bookingId_userId: { bookingId, userId } },
    update: { lastReadAt: now },
    create: { bookingId, userId, lastReadAt: now },
  });
}
