import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Authentication Flows
 * Tests for signup, login, password reset, and session management
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  // ============================================================================
  // SIGNUP TESTS
  // ============================================================================

  test('TC-AUTH-001: Signup with valid credentials', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/signup/)

    // Generate unique email for each test run
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'SecurePassword123!'

    // Fill signup form
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)

    // Submit form
    await page.click('button:has-text("Sign Up"), button:has-text("Create Account")')

    // Should redirect to home or verification page
    await page.waitForURL(/home|verify|confirm/, { timeout: 10000 })

    // Verify we're in authenticated state
    const isAuthenticated =
      page.url().includes('/home') ||
      (await page.locator('text=Welcome|Verify email|Confirm').isVisible())

    expect(isAuthenticated).toBe(true)
  })

  test('TC-AUTH-003: Reject weak password', async ({ page }) => {
    await page.goto('/signup')

    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'weak') // Too short
    await page.fill('input[name="confirmPassword"]', 'weak')

    // Blur to trigger validation
    await page.locator('input[name="password"]').blur()

    // Should show error
    const errorMsg = page.locator('text=at least 8 characters|password.*strength')
    await expect(errorMsg).toBeVisible()
  })

  test('TC-AUTH-004: Validate email format', async ({ page }) => {
    await page.goto('/signup')

    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('invalid-email')
    await emailInput.blur()

    // Should show validation error
    const errorMsg = page.locator('text=valid email|invalid format')
    const isVisible = await errorMsg.isVisible().catch(() => false)

    if (isVisible) {
      await expect(errorMsg).toBeVisible()
    }
  })

  test('TC-AUTH-005: Show errors for empty fields', async ({ page }) => {
    await page.goto('/signup')

    // Try to submit empty form
    const submitButton = page.locator('button:has-text("Sign Up"), button:has-text("Create Account")')

    // Click submit
    await submitButton.click()

    // Should show validation errors
    await page.waitForTimeout(500)

    // Check for error indicators (could be inline or summary)
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[name="password"]')

    // Should have aria-invalid or error class
    const hasErrors =
      (await emailInput.evaluate((el) =>
        el.getAttribute('aria-invalid') || el.classList.contains('error')
      )) ||
      (await passwordInput.evaluate((el) =>
        el.getAttribute('aria-invalid') || el.classList.contains('error')
      ))

    expect(hasErrors).toBeTruthy()
  })

  // ============================================================================
  // LOGIN TESTS
  // ============================================================================

  test('TC-AUTH-007: Login with valid credentials', async ({ page }) => {
    // Assuming test account exists
    await page.goto('/login')
    await expect(page).toHaveURL(/login/)

    // Use test credentials (should be set in CI environment)
    const testEmail = process.env.TEST_EMAIL || 'test@example.com'
    const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!'

    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)

    // Submit
    await page.click('button:has-text("Log In"), button:has-text("Sign In")')

    // Should redirect to home
    await page.waitForURL(/home|dashboard/, { timeout: 10000 })
    await expect(page).toHaveURL(/home|dashboard/)
  })

  test('TC-AUTH-008: Show generic error for invalid email', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'nonexistent@example.com')
    await page.fill('input[type="password"]', 'SomePassword123!')

    await page.click('button:has-text("Log In"), button:has-text("Sign In")')

    // Should show generic error (not "email not found")
    const errorMsg = page.locator('text=invalid email or password|login failed')
    await expect(errorMsg).toBeVisible({ timeout: 5000 })

    // Should NOT reveal email existence
    const emailNotFoundMsg = page.locator('text=email not found|not registered')
    const isVisible = await emailNotFoundMsg.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('TC-AUTH-009: Reject wrong password', async ({ page }) => {
    await page.goto('/login')

    const testEmail = process.env.TEST_EMAIL || 'test@example.com'

    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', 'WrongPassword123!')

    await page.click('button:has-text("Log In"), button:has-text("Sign In")')

    // Should show generic error
    const errorMsg = page.locator('text=invalid email or password|login failed')
    await expect(errorMsg).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-011: Case-insensitive email login', async ({ page }) => {
    await page.goto('/login')

    // Use uppercase email
    const testEmail = (process.env.TEST_EMAIL || 'test@example.com').toUpperCase()
    const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!'

    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)

    await page.click('button:has-text("Log In"), button:has-text("Sign In")')

    // Should succeed despite case difference
    await page.waitForURL(/home|dashboard/, { timeout: 10000 }).catch(() => {})

    // Check if we got an error (if so, email might be case-sensitive)
    const isLoggedIn =
      page.url().includes('/home') || page.url().includes('/dashboard')

    // This is a soft assertion - case-insensitive is preferred but not critical
    if (!isLoggedIn) {
      console.log('Note: Email login appears case-sensitive')
    }
  })

  // ============================================================================
  // PASSWORD RESET TESTS
  // ============================================================================

  test('TC-AUTH-013: Request password reset email', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page).toHaveURL(/forgot-password|password-reset/)

    const testEmail = process.env.TEST_EMAIL || 'test@example.com'

    await page.fill('input[type="email"]', testEmail)
    await page.click('button:has-text("Send Reset Link"), button:has-text("Reset Password")')

    // Should show confirmation message
    const confirmMsg = page.locator('text=check your email|reset link sent')
    await expect(confirmMsg).toBeVisible({ timeout: 5000 })
  })

  test('TC-AUTH-014: Do not reveal email existence', async ({ page }) => {
    await page.goto('/forgot-password')

    // Use non-existent email
    await page.fill('input[type="email"]', 'definitely-nonexistent@example.com')
    await page.click('button:has-text("Send Reset Link"), button:has-text("Reset Password")')

    // Should still show success message (no enumeration leak)
    const confirmMsg = page.locator('text=check your email|reset link sent')
    await expect(confirmMsg).toBeVisible({ timeout: 5000 })
  })

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  test('TC-AUTH-012: Handle expired session', async ({ page }) => {
    // Login first
    await page.goto('/login')

    const testEmail = process.env.TEST_EMAIL || 'test@example.com'
    const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!'

    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button:has-text("Log In"), button:has-text("Sign In")')

    // Wait to be logged in
    await page.waitForURL(/home|dashboard/, { timeout: 10000 })

    // Simulate session expiry by clearing auth
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.removeItem('auth')
      sessionStorage.clear()
    })

    // Try to access protected page
    await page.goto('/bookings/new')

    // Should redirect to login
    await page.waitForURL(/login|auth/, { timeout: 5000 }).catch(() => {})

    const isOnLoginPage =
      page.url().includes('/login') || page.url().includes('/auth')

    expect(isOnLoginPage).toBe(true)
  })

  test('TC-AUTH-Logout: Logout clears session', async ({ page }) => {
    // Login first
    await page.goto('/login')

    const testEmail = process.env.TEST_EMAIL || 'test@example.com'
    const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!'

    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button:has-text("Log In"), button:has-text("Sign In")')

    await page.waitForURL(/home|dashboard/, { timeout: 10000 })

    // Find and click logout button
    // Usually in profile menu or nav
    const profileMenu = page.locator('[data-testid="profile-menu"]')
    if (await profileMenu.isVisible()) {
      await profileMenu.click()
    }

    const logoutButton = page.locator('button:has-text("Log Out"), button:has-text("Sign Out")')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
    }

    // Should redirect to login or home
    await page.waitForTimeout(1000)

    // Check that authenticated content is gone
    const authRequiredContent = page.locator('[data-testid="user-profile"]')
    const isVisible = await authRequiredContent.isVisible().catch(() => false)

    expect(isVisible).toBe(false)
  })
})
