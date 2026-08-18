import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * One role check per route GROUP, not per screen (18 screens -> 3 checks):
 *   /advisor/*  -> ADVISOR
 *   /ops/*      -> OPS_ADMIN
 *   customer-owned areas (below) -> any signed-in user
 *   everything else -> public
 *
 * Auth-level gate only decides "can this role reach this route group". The
 * advisor "verified vs not-yet-verified" distinction is an APPLICATION-level
 * check against AdvisorProfile.verificationStatus, deliberately not here.
 */

/**
 * Routes where a customer's own data lives. Signup-first: a need belongs to an
 * account from the moment it's created, so posting one requires a session.
 * Public marketing ("/", "/advisors/:id") and the auth routes stay open.
 */
const CUSTOMER_PREFIXES = ["/needs", "/bookings", "/home", "/messages", "/account"];

export async function middleware(request: NextRequest) {
  const { response, user, role, mfaRequired } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Two-factor gate: a signed-in user who enabled 2FA but hasn't cleared the
  // second step this session is sent to /mfa first. Auth/entry routes are exempt
  // so there's no redirect loop and they can still sign out.
  const mfaExempt =
    pathname === "/mfa" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";
  if (user && mfaRequired && !mfaExempt) {
    const url = request.nextUrl.clone();
    url.pathname = "/mfa";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Segment-aware so the public "/advisors/:id" profile route is NOT caught by
  // the advisor-dashboard gate ("/advisor", "/advisor/..."). "/advisors" is a
  // separate, public customer route group.
  // "/advisor/apply" is the public application entry — prospective advisors must
  // reach it before they have an account, so it's exempt from the advisor gate.
  const isAdvisorApply = pathname === "/advisor/apply";
  const needsAdvisor =
    !isAdvisorApply && (pathname === "/advisor" || pathname.startsWith("/advisor/"));
  const needsOps = pathname === "/ops" || pathname.startsWith("/ops/");

  if ((needsAdvisor || needsOps) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (needsAdvisor && role !== "ADVISOR" && role !== "OPS_ADMIN") {
    // Signed-in non-advisor: send them to the application (which offers a
    // one-click "Continue as an advisor") rather than silently bouncing home.
    // /advisor/apply is exempt from this gate, so there's no redirect loop.
    return NextResponse.redirect(new URL("/advisor/apply", request.url));
  }

  if (needsOps && role !== "OPS_ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Customer-owned areas. Anonymous visitors go to /signup rather than /login:
  // the funnel now starts with creating an account, and the signup page links
  // across to sign-in for people who already have one. The full path AND query
  // are round-tripped through ?next= so "/bookings/new?advisorId=…" survives.
  const needsCustomer = CUSTOMER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (needsCustomer && !user) {
    const target = `${pathname}${request.nextUrl.search}`;
    const url = request.nextUrl.clone();
    url.pathname = "/signup";
    url.search = "";
    url.searchParams.set("next", target);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /**
   * Run on everything except static assets. The extension list must cover EVERY
   * static file type served from /public, not just images: a request that
   * reaches this middleware pays a live Supabase auth round trip before the file
   * is served, so leaving fonts out of the list put a network auth call in front
   * of all eight self-hosted woff2 files on every cold page load.
   *
   * Only genuinely static suffixes belong here. No page or API route ends in one
   * of these extensions, which is what lets the session header set in
   * updateSession() be trusted downstream — every route that renders is gated.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|css|js|map|json|txt|xml)$).*)",
  ],
};
