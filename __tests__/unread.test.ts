import { unreadFilters, unreadByBooking, badgeLabel, bellLabel } from "@/lib/unread";

/**
 * The unread rules behind the advisor's message bell. Pure, so the parts that
 * are easy to get wrong and invisible in a rendered count can be pinned without
 * a database.
 */
describe("unreadFilters", () => {
  const me = "user-me";
  const then = new Date("2026-08-20T00:00:00.000Z");

  it("never counts your own messages", () => {
    const [f] = unreadFilters([{ bookingId: "b1", lastReadAt: then }], me);
    // A badge that lights up because you replied is worse than no badge.
    expect(f.senderId).toEqual({ not: me });
  });

  it("counts only what arrived after you last opened the thread", () => {
    const [f] = unreadFilters([{ bookingId: "b1", lastReadAt: then }], me);
    expect(f.createdAt).toEqual({ gt: then });
  });

  it("treats a never-opened thread as unread from the beginning, not as zero", () => {
    // Reading an absent marker as "all read" silently hides the first message a
    // client ever sends. No createdAt bound means the clause covers the thread.
    const [f] = unreadFilters([{ bookingId: "b1", lastReadAt: null }], me);
    expect(f.createdAt).toBeUndefined();
    expect(f.bookingId).toBe("b1");
  });

  it("returns one clause per thread", () => {
    const filters = unreadFilters(
      [
        { bookingId: "b1", lastReadAt: then },
        { bookingId: "b2", lastReadAt: null },
      ],
      me,
    );
    expect(filters.map((f) => f.bookingId)).toEqual(["b1", "b2"]);
  });

  it("returns nothing when the viewer is on no threads", () => {
    // The caller must skip the query on an empty array: Prisma reads `{ OR: [] }`
    // as "match everything", which would count the entire message table.
    expect(unreadFilters([], me)).toEqual([]);
  });
});

describe("unreadByBooking", () => {
  it("maps counts by booking", () => {
    const m = unreadByBooking([
      { bookingId: "b1", _count: 3 },
      { bookingId: "b2", _count: 1 },
    ]);
    expect(m.get("b1")).toBe(3);
    expect(m.get("b2")).toBe(1);
  });

  it("reports nothing for a thread with no unread messages", () => {
    expect(unreadByBooking([]).get("b1")).toBeUndefined();
  });
});

describe("badgeLabel", () => {
  it("shows no badge at zero", () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(-1)).toBeNull();
  });

  it("shows the exact count up to the cap", () => {
    expect(badgeLabel(1)).toBe("1");
    expect(badgeLabel(99)).toBe("99");
  });

  it("caps rather than breaking the header layout", () => {
    expect(badgeLabel(100)).toBe("99+");
    expect(badgeLabel(4821)).toBe("99+");
  });
});

describe("bellLabel", () => {
  it("names the count for screen readers, singular and plural", () => {
    expect(bellLabel(1)).toBe("Messages — 1 unread message");
    expect(bellLabel(2)).toBe("Messages — 2 unread messages");
  });

  it("still says something meaningful at zero", () => {
    expect(bellLabel(0)).toBe("Messages — nothing unread");
  });
});
