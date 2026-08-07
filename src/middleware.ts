import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * One role check per route GROUP, not per screen (18 screens -> 3 checks):
 *   /advisor/*  -> ADVISOR
 *   /ops/*      -> OPS_ADMIN
 *   everything else (customer routes) -> public / CUSTOMER
 *
 * Auth-level gate only decides "can this role reach this route group". The
 * advisor "verified vs not-yet-verified" distinction is an APPLICATION-level
 * check against AdvisorProfile.verificationStatus, deliberately not here.
 */
export async function middleware(request: NextRequest) {
  const { response, user, role } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (needsOps && role !== "OPS_ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
