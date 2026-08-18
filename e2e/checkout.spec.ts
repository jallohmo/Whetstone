import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  seedCheckout,
  signedInCredentialsPresent,
  MISSING_CREDENTIALS_MESSAGE,
  type CheckoutFixtures,
} from "./fixtures/checkout-fixtures";

/**
 * E2E: a signed-in client can reach checkout, and it says cover is active.
 *
 * This exists because of a production outage: INSURANCE_COVERAGE_ACTIVE was
 * absent from the deployed environment, so the gate in lib/platform-config.ts —
 * which compares against the literal string "true" — read "no cover", and every
 * payment attempt threw. Nothing caught it, because nothing in the suite had a
 * session, and checkout is behind one.
 *
 * Scope is deliberately narrow: sign in, load checkout, assert what it says. No
 * matching, no booking flow, no payment click. The booking is seeded directly,
 * so a failure here means the checkout screen or its configuration is broken —
 * not that some earlier screen changed a button label.
 *
 * It is a configuration guard as much as a code one, which is why it belongs in
 * a browser test rather than a unit test: the value it checks only exists in a
 * deployed environment.
 */

test.describe.configure({ mode: "serial" });

test.skip(!signedInCredentialsPresent, MISSING_CREDENTIALS_MESSAGE);

let fixtures: CheckoutFixtures;
let teardown: () => Promise<void>;
let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  ({ fixtures, teardown } = await seedCheckout());
  context = await browser.newContext();
  page = await context.newPage();

  // Sign in through the real login form, as a client would.
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(fixtures.client.email);
  await page.locator('input[name="password"]').fill(fixtures.client.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/home/);
});

test.afterAll(async () => {
  await context?.close();
  await teardown?.();
});

test("checkout loads for a signed-in client", async () => {
  const response = await page.goto(`/bookings/${fixtures.bookingId}/checkout`);

  // A 500 here is the shape the insurance outage took once the advisor clicked
  // through — worth asserting separately from the content below.
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(new RegExp(`/bookings/${fixtures.bookingId}/checkout`));
  await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();

  // The booking's own details, so a page that renders but shows the wrong
  // booking (or none) still fails.
  await expect(page.getByText(fixtures.advisorHandle).first()).toBeVisible();
  await expect(page.getByText(fixtures.scopeDescription).first()).toBeVisible();
});

test("checkout reports insurance cover as active", async () => {
  // The regression guard. InsuranceCoverageNotice renders one of two states:
  // the covered statement, or an amber "being confirmed" warning that means
  // INSURANCE_COVERAGE_ACTIVE is missing or is not exactly the string "true".
  await expect(page.getByText(/professional indemnity policy/i)).toBeVisible();
  await expect(page.getByText(/coverage is being confirmed/i)).toHaveCount(0);
});

test("the payment button is offered, not disabled", async () => {
  // Without Stripe configured this reads "Confirm booking"; with it, "Continue
  // to secure payment". Either is fine — what matters is that a client is being
  // offered a way to pay. Deliberately NOT clicked: this spec stops short of
  // moving money.
  const pay = page.getByRole("button", {
    name: /confirm booking|continue to secure payment/i,
  });
  await expect(pay).toBeVisible();
  await expect(pay).toBeEnabled();
});
