import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/observability";
import type { AvatarGradient } from "@/components/ui/Avatar";

/**
 * Read-only helpers that feed the marketing surfaces (landing hero, auth panels)
 * with REAL platform data instead of hardcoded sample people. Every helper fails
 * soft — on any error, or when there simply isn't data yet, it returns an empty
 * shape and the caller falls back to a non-fabricated default. Never invent a
 * person or a quote here.
 */

export interface FeaturedAdvisor {
  id: string;
  handle: string;
  avatarUrl: string | null;
  headline: string | null;
  yearsExperience: number;
  avgRating: number | null;
  sessionCount: number;
  focus: string | null;
  packageLabel: string | null;
  priceCents: number | null;
  currency: string | null;
}

export interface RingMember {
  initials: string;
  src: string | null;
}

export interface LandingData {
  featured: FeaturedAdvisor | null;
  ring: RingMember[];
  matchedCount: number;
}

function handleOf(email: string): string {
  return email.split("@")[0];
}
function initialsOf(email: string): string {
  const h = handleOf(email);
  const parts = h.split(/[._-]+/).filter(Boolean);
  const raw = parts.length >= 2 ? parts[0][0] + parts[1][0] : h.slice(0, 2);
  return raw.toUpperCase();
}

export async function getLandingData(): Promise<LandingData> {
  try {
    const [verified, cheapest, matchedCount] = await Promise.all([
      prisma.advisorProfile.findMany({
        where: { verificationStatus: "VERIFIED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: { select: { email: true } },
          specialtyTags: { select: { name: true } },
          bookings: { include: { review: true } },
        },
      }),
      prisma.package.findFirst({ where: { active: true }, orderBy: { priceCents: "asc" } }),
      prisma.booking.count({
        where: { status: { in: ["confirmed", "in_progress", "completed"] } },
      }),
    ]);

    const ring: RingMember[] = verified.slice(0, 4).map((a) => ({
      initials: initialsOf(a.user.email),
      src: a.avatarUrl,
    }));

    // Feature the highest-rated verified advisor (most sessions breaks ties).
    const scored = verified
      .map((a) => {
        const ratings = a.bookings
          .map((b) => b.review?.rating)
          .filter((r): r is number => typeof r === "number");
        const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;
        return { a, avg, sessions: a.bookings.length };
      })
      .sort((x, y) => (y.avg ?? 0) - (x.avg ?? 0) || y.sessions - x.sessions);

    const top = scored[0];
    const featured: FeaturedAdvisor | null = top
      ? {
          id: top.a.id,
          handle: handleOf(top.a.user.email),
          avatarUrl: top.a.avatarUrl,
          headline: top.a.headline,
          yearsExperience: top.a.yearsExperience,
          avgRating: top.avg,
          sessionCount: top.sessions,
          focus: top.a.specialtyTags[0]?.name ?? null,
          packageLabel: cheapest ? `${cheapest.sessionCount} ${cheapest.sessionCount === 1 ? "session" : "sessions"} · insured` : null,
          priceCents: cheapest?.priceCents ?? null,
          currency: cheapest?.currency ?? null,
        }
      : null;

    return { featured, ring, matchedCount };
  } catch (err) {
    reportError("getLandingData: failed to load featured marketing data", err);
    return { featured: null, ring: [], matchedCount: 0 };
  }
}

export interface FeaturedTestimonial {
  quote: string;
  name: string;
  meta: string;
  initials: string;
  gradient: AvatarGradient;
}

/**
 * A real customer review to use as a testimonial. Requires written text and a
 * strong rating; attribution is the customer's business name (never their email).
 */
export async function getFeaturedTestimonial(): Promise<FeaturedTestimonial | null> {
  try {
    const review = await prisma.review.findFirst({
      where: { writtenReview: { not: null }, rating: { gte: 4 } },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      include: {
        booking: {
          select: {
            customer: {
              select: {
                businessName: true,
                industry: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!review?.writtenReview) return null;

    const c = review.booking.customer;
    const name = c.businessName;
    return {
      quote: review.writtenReview,
      name,
      meta: c.industry?.name ? `${c.industry.name} · verified booking` : "Verified booking",
      initials: name.slice(0, 2).toUpperCase(),
      gradient: "cyan-green",
    };
  } catch (err) {
    reportError("getFeaturedTestimonial: failed to load a review", err);
    return null;
  }
}
