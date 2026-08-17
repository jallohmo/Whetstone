import { test, expect } from "@playwright/test";

/**
 * E2E: the signup-first funnel gate.
 *
 * These run against a production build with no Supabase or database credentials,
 * which is deliberate: getCurrentUser() fails closed to "logged out" and the
 * marketing queries fall back to empty, so every assertion here is about the
 * logged-out path — exactly the part a regression would break silently.
 *
 * Anything requiring a real session (posting a challenge, viewing a shortlist,
 * booking) needs seeded auth and belongs in a separate suite with a database
 * service; it is deliberately NOT faked here.
 */

/** Customer-owned areas. Middleware must bounce an anonymous visitor to signup. */
const GATED_ROUTES = [
  "/needs/new",
  "/home",
  "/bookings",
  // Completion confirmation releases the advisor's payment, so it must never be
  // reachable without a session — the page re-checks ownership too.
  "/bookings/abc123/confirm-completion",
  "/messages",
  "/account",
];

/** Public surface. Must stay reachable without an account. */
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/terms", "/privacy"];

test.describe("public pages", () => {
  for (const path of PUBLIC_ROUTES) {
    test(`${path} loads without an account`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}`));
    });
  }

  test("landing page leads with the intake call to action", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /describe your business challenge/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/needs/new");
  });

  test("landing page does not promise a no-account flow", async ({ page }) => {
    await page.goto("/");
    // The old guest-first pitch. If this reappears the copy has regressed.
    await expect(page.locator("body")).not.toContainText(/no account needed/i);
  });
});

test.describe("gated routes redirect anonymous visitors to signup", () => {
  for (const path of GATED_ROUTES) {
    test(`${path} redirects to /signup carrying next`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/signup\\?next=${encodeURIComponent(path)}`));
    });
  }

  test("the booking entry point keeps its query string through the redirect", async ({ page }) => {
    await page.goto("/bookings/new?advisorId=abc123");
    // Without the query surviving, a signed-up client lands on a booking page
    // with no advisor selected.
    await expect(page).toHaveURL(/\/signup\?next=/);
    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toBe("/bookings/new?advisorId=abc123");
  });

  test("clicking the landing CTA while logged out lands on signup", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /describe your business challenge/i }).first().click();
    await expect(page).toHaveURL(/\/signup\?next=%2Fneeds%2Fnew/);
  });
});

test.describe("auth pages", () => {
  test("signup renders an email and password form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  // Scoped to the card's own prompt: the site header carries its own unqualified
  // "Sign in" link, and matching that instead would assert nothing useful.
  test("signup carries next across to sign-in for returning clients", async ({ page }) => {
    await page.goto("/signup?next=%2Fneeds%2Fnew");
    const signIn = page
      .locator("p", { hasText: /already have an account/i })
      .getByRole("link", { name: /sign in/i });
    await expect(signIn).toHaveAttribute("href", /next=%2Fneeds%2Fnew/);
  });

  test("login carries next back to signup", async ({ page }) => {
    await page.goto("/login?next=%2Fneeds%2Fnew");
    const create = page
      .locator("p", { hasText: /new here/i })
      .getByRole("link", { name: /create an account/i });
    await expect(create).toHaveAttribute("href", /next=%2Fneeds%2Fnew/);
  });

  test("signup posts next through the form so the destination survives auth", async ({ page }) => {
    await page.goto("/signup?next=%2Fneeds%2Fnew");
    await expect(page.locator('input[name="next"]')).toHaveValue("/needs/new");
  });
});

test.describe("ops and advisor areas stay closed", () => {
  test("/ops redirects an anonymous visitor to login", async ({ page }) => {
    await page.goto("/ops");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("/advisor redirects an anonymous visitor to login", async ({ page }) => {
    await page.goto("/advisor");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("/advisor/apply stays public so advisors can apply", async ({ page }) => {
    const response = await page.goto("/advisor/apply");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/advisor\/apply/);
  });
});
