import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  seedJourney,
  journeyCredentialsPresent,
  MISSING_CREDENTIALS_MESSAGE,
  type JourneyFixtures,
} from "./fixtures/journey-fixtures";

/**
 * E2E: the whole revenue path, signed in — post a challenge, get matched by ops,
 * book, pay.
 *
 * This is the suite funnel.spec.ts defers to ("anything requiring a real session
 * … belongs in a separate suite with a database service"). It exists because
 * every step below is a place the platform can break in a way no unit test sees:
 * the steps span three roles, two sessions, a server action per stage, and one
 * environment variable that decides whether money can move at all.
 *
 * It is written as one strictly ordered journey rather than independent tests,
 * because that is what it is — step 4 has nothing to assert until step 3 has
 * released a shortlist. Two browser contexts run side by side (client and ops) so
 * neither has to sign out and back in mid-journey.
 *
 * Payment: Stripe is intentionally NOT configured for E2E. createCheckout then
 * takes its documented dev path — recording a held Payment and confirming the
 * booking — which exercises the insurance gate, the payment record and the
 * confirmation screen without depending on Stripe's hosted checkout.
 */

test.describe.configure({ mode: "serial" });

test.skip(!journeyCredentialsPresent, MISSING_CREDENTIALS_MESSAGE);

let fixtures: JourneyFixtures;
let teardown: () => Promise<void>;
let clientContext: BrowserContext;
let opsContext: BrowserContext;
let clientPage: Page;
let opsPage: Page;

/** The need created in step 2, needed by every step after it. */
let needId: string;
/** The booking created in step 5. */
let bookingId: string;

/** Sign in through the real login form, as a user would. */
async function signIn(page: Page, email: string, password: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(landsOn);
}

test.beforeAll(async ({ browser }) => {
  ({ fixtures, teardown } = await seedJourney());
  clientContext = await browser.newContext();
  opsContext = await browser.newContext();
  clientPage = await clientContext.newPage();
  opsPage = await opsContext.newPage();
});

test.afterAll(async () => {
  await clientContext?.close();
  await opsContext?.close();
  await teardown?.();
});

test("1. a client signs in and lands on their home", async () => {
  await signIn(clientPage, fixtures.client.email, fixtures.client.password, /\/home/);
  // Proves the session is real rather than a redirect that happened to land right:
  // /account is middleware-gated and would bounce an anonymous visitor to signup.
  await clientPage.goto("/account");
  await expect(clientPage).toHaveURL(/\/account/);
});

test("2. the client posts a business challenge", async () => {
  await clientPage.goto("/needs/new");
  await clientPage.locator('input[name="businessName"]').fill("E2E Journey Co");
  await clientPage.locator('select[name="industryId"]').selectOption(fixtures.industry.id);
  await clientPage
    .locator('input[name="problemArea"]')
    .fill(`Pricing strategy (e2e ${fixtures.runId})`);
  await clientPage
    .locator('textarea[name="description"]')
    .fill("Our margins are shrinking and we do not know which product line is at fault.");
  await clientPage.getByRole("button", { name: /see who can help/i }).click();

  // createNeed redirects to the shortlist, which is where the id becomes visible.
  await expect(clientPage).toHaveURL(/\/needs\/[^/]+\/matches/);
  needId = new URL(clientPage.url()).pathname.split("/")[2];
  expect(needId).toBeTruthy();
});

test("3. the client sees a waiting state until ops release a shortlist", async () => {
  // The need is "open": matching is by hand, so there must be nothing to book yet.
  await expect(clientPage.getByRole("link", { name: /view profile/i })).toHaveCount(0);
});

test("4. ops shortlist an advisor and release it", async () => {
  await signIn(opsPage, fixtures.ops.email, fixtures.ops.password, /\/ops/);

  await opsPage.goto(`/ops/needs/${needId}/match`);
  await expect(opsPage.getByRole("heading", { name: /match need/i })).toBeVisible();

  // The seeded advisor is VERIFIED and tagged with this need's industry, so the
  // workbench lists them by the local part of their email.
  await opsPage.getByRole("radio", { name: `Choose ${fixtures.advisor.handle}` }).check();
  await opsPage
    .locator('textarea[name="reason"]')
    .fill("Ran pricing for two comparable businesses in this sector.");
  await opsPage.getByRole("button", { name: /add to shortlist/i }).click();

  // The decision log is mandatory, so the shortlist should now name the advisor.
  await expect(opsPage.getByText(fixtures.advisor.handle).first()).toBeVisible();

  // Releasing is the separate, explicit step — this is what the client sees.
  await opsPage.getByRole("button", { name: /send to client/i }).click();
  await expect(opsPage).toHaveURL(/\/ops\/needs/);
});

test("5. the client books the shortlisted advisor", async () => {
  await clientPage.goto(`/needs/${needId}/matches`);
  await clientPage.getByRole("link", { name: /view profile/i }).first().click();
  await expect(clientPage).toHaveURL(new RegExp(`/advisors/${fixtures.advisor.profileId}`));

  await clientPage.getByRole("link", { name: /book a session/i }).click();
  await expect(clientPage).toHaveURL(/\/bookings\/new/);

  // A package and a slot are both pre-selected (first of each), so submitting as-is
  // is the ordinary path. An advisor with no free slot disables this button, which
  // is why the fixture seeds one.
  const submit = clientPage.getByRole("button", { name: /continue to checkout/i });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(clientPage).toHaveURL(/\/bookings\/[^/]+\/checkout/);
  bookingId = new URL(clientPage.url()).pathname.split("/")[2];
  expect(bookingId).toBeTruthy();
});

/**
 * The regression guard for the production incident where checkout threw
 * "Insurance coverage is not active — cannot take payment": INSURANCE_COVERAGE_ACTIVE
 * was absent from the deployed environment. The page renders the coverage state,
 * so assert the covered banner BEFORE paying — that way a misconfigured environment
 * fails here, naming the cause, rather than as an opaque error on the next click.
 */
test("6. checkout shows active insurance cover, not the pending-cover warning", async () => {
  await expect(clientPage.getByText(/professional indemnity policy/i)).toBeVisible();
  await expect(clientPage.getByText(/coverage is being confirmed/i)).toHaveCount(0);
});

test("7. paying confirms the booking and holds the money", async () => {
  // Without Stripe configured this reads "Confirm booking"; with it, "Continue to
  // secure payment". Accept either so the suite works against both setups.
  await clientPage
    .getByRole("button", { name: /confirm booking|continue to secure payment/i })
    .click();

  await expect(clientPage).toHaveURL(new RegExp(`/bookings/${bookingId}/confirmed`));
  await expect(clientPage.getByRole("heading", { name: /you're booked in/i })).toBeVisible();
});

test("8. the booking appears as confirmed in the client's bookings", async () => {
  await clientPage.goto("/bookings");
  await expect(clientPage.getByText(fixtures.advisor.handle).first()).toBeVisible();
  // The exact customer-facing label. Asserting loosely would also pass on
  // "Awaiting payment", which is precisely the failure this step exists to catch.
  await expect(clientPage.getByText("Confirmed", { exact: true }).first()).toBeVisible();
});
