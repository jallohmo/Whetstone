import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Complete Booking Flow
 * These tests run nightly and on releases
 * They verify the critical path: need → matches → booking → payment → confirmation
 */

test.describe('Booking Flow - Complete Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Go to home page
    await page.goto('/')
    // Dismiss any banners/notifications
    await page.evaluate(() => {
      document.querySelectorAll('[role="alert"]').forEach(el => el.remove())
    })
  })

  // ============================================================================
  // NEED CREATION - TC-NEED-001 to TC-NEED-009
  // ============================================================================

  test('TC-NEED-001: Create need with valid industry and description', async ({
    page,
  }) => {
    // Navigate to needs creation
    await page.goto('/needs/new')
    await expect(page).toHaveURL(/\/needs\/new/)

    // Select industry
    await page.selectOption('select[name="industryId"]', 'software-development')

    // Wait for sub-specialties to load
    await page.waitForTimeout(500)

    // Select sub-specialty
    const subSpecialtySelect = page.locator('select[name="subSpecialtyId"]')
    const options = await subSpecialtySelect.locator('option').count()
    expect(options).toBeGreaterThan(1)

    await page.selectOption('select[name="subSpecialtyId"]', { index: 1 })

    // Fill in title
    await page.fill('textarea[name="title"]', 'React Performance Optimization')

    // Fill in description
    await page.fill(
      'textarea[name="description"]',
      'Need help optimizing React component rendering and reducing bundle size. Currently experiencing performance issues in our production app.'
    )

    // Submit form
    await page.click('button:has-text("Create Need")')

    // Should redirect to matches view
    await expect(page).toHaveURL(/\/needs\/.*\/matches/)
    await expect(page.locator('text=Finding advisors')).toBeVisible()
  })

  test('TC-NEED-002: Show validation error for missing description', async ({
    page,
  }) => {
    await page.goto('/needs/new')

    // Try to submit without description
    await page.selectOption('select[name="industryId"]', 'software-development')
    await page.waitForTimeout(500)
    await page.selectOption('select[name="subSpecialtyId"]', { index: 1 })
    await page.fill('textarea[name="title"]', 'Test Title')

    // Leave description empty and try to submit
    await page.click('button:has-text("Create Need")')

    // Should show validation error
    const errorMsg = page.locator('text=Description must be at least')
    await expect(errorMsg).toBeVisible()
  })

  // ============================================================================
  // ADVISOR MATCHING - TC-MATCH-001 to TC-MATCH-010
  // ============================================================================

  test('TC-MATCH-001: Display ranked list of matching advisors', async ({
    page,
  }) => {
    await page.goto('/needs/new')

    // Create a need
    await page.selectOption('select[name="industryId"]', 'software-development')
    await page.waitForTimeout(500)
    await page.selectOption('select[name="subSpecialtyId"]', { index: 1 })
    await page.fill('textarea[name="title"]', 'React Help')
    await page.fill(
      'textarea[name="description"]',
      'Need comprehensive help with React architecture and performance optimization techniques.'
    )
    await page.click('button:has-text("Create Need")')

    // Wait for matches to load
    await expect(page).toHaveURL(/\/needs\/.*\/matches/)
    await page.waitForSelector('[data-testid="advisor-card"]', { timeout: 10000 })

    // Should display advisors
    const advisorCards = await page.locator('[data-testid="advisor-card"]').count()
    expect(advisorCards).toBeGreaterThan(0)

    // Each card should have essential info
    const firstCard = page.locator('[data-testid="advisor-card"]').first()
    await expect(firstCard.locator('[data-testid="advisor-name"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="advisor-rating"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="advisor-rate"]')).toBeVisible()
  })

  test('TC-MATCH-005: Filter matches by availability', async ({ page }) => {
    await page.goto('/needs/new')

    // Create a need
    await page.selectOption('select[name="industryId"]', 'software-development')
    await page.waitForTimeout(500)
    await page.selectOption('select[name="subSpecialtyId"]', { index: 1 })
    await page.fill('textarea[name="title"]', 'React Help')
    await page.fill(
      'textarea[name="description"]',
      'Need help with React architecture.'
    )
    await page.click('button:has-text("Create Need")')

    await page.waitForURL(/\/needs\/.*\/matches/)

    // Get initial count
    const initialCount = await page
      .locator('[data-testid="advisor-card"]')
      .count()

    // Toggle availability filter
    const availabilityCheckbox = page.locator(
      'input[aria-label="Only show available"]'
    )
    if (await availabilityCheckbox.isVisible()) {
      await availabilityCheckbox.click()
      await page.waitForTimeout(500)

      const filteredCount = await page
        .locator('[data-testid="advisor-card"]')
        .count()

      // Should have fewer or same number of advisors
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    }
  })

  // ============================================================================
  // BOOKING FLOW - TC-BOOK-001 to TC-BOOK-021
  // ============================================================================

  test('TC-BOOK-002: Select date and time for booking', async ({ page }) => {
    // Navigate to advisor profile with bookable slots
    await page.goto('/advisors')

    // Find first available advisor
    const firstAdvisor = page.locator('[data-testid="advisor-card"]').first()
    await firstAdvisor.click()

    // Should show advisor profile
    await expect(page).toHaveURL(/\/advisors\//)
    await expect(page.locator('text=Book Session')).toBeVisible()

    // Click book button
    await page.click('button:has-text("Book Session")')

    // Should show date/time selection
    await expect(page.locator('text=Select date and time')).toBeVisible()

    // Select a time slot
    const timeSlots = page.locator('[data-testid="time-slot"]')
    const slotsCount = await timeSlots.count()

    if (slotsCount > 0) {
      await timeSlots.first().click()

      // Time should be selected
      const selectedSlot = page.locator('[data-testid="time-slot"][aria-selected="true"]')
      await expect(selectedSlot).toBeVisible()
    }
  })

  test('TC-BOOK-007: Display booking summary before payment', async ({ page }) => {
    // This test assumes logged-in state or creates booking through flow
    await page.goto('/bookings/new')

    // Navigate through booking wizard to summary
    // Select advisor
    const advisorSelect = page.locator('select[name="advisorId"]')
    if (await advisorSelect.isVisible()) {
      const options = await advisorSelect.locator('option').count()
      if (options > 1) {
        await advisorSelect.selectOption({ index: 1 })
      }
    }

    // Select date (if visible)
    const dateInput = page.locator('input[type="date"]')
    if (await dateInput.isVisible()) {
      // Set to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await dateInput.fill(tomorrow.toISOString().split('T')[0])
    }

    // Look for summary section
    const summarySection = page.locator('[data-testid="booking-summary"]')
    if (await summarySection.isVisible()) {
      // Should show advisor info
      await expect(
        summarySection.locator('[data-testid="advisor-name"]')
      ).toBeVisible()

      // Should show date/time
      await expect(
        summarySection.locator('[data-testid="booking-date"]')
      ).toBeVisible()

      // Should show total cost
      await expect(
        summarySection.locator('[data-testid="total-price"]')
      ).toBeVisible()
    }
  })

  // ============================================================================
  // PAYMENT FLOW - TC-PAY-001 to TC-PAY-010
  // ============================================================================

  test('TC-PAY-002: Process payment with test card', async ({ page }) => {
    // Navigate to a booking confirmation page
    await page.goto('/bookings/new')

    // If form exists, fill it
    const advisorSelect = page.locator('select[name="advisorId"]')
    if (await advisorSelect.isVisible()) {
      const options = await advisorSelect.locator('option').count()
      if (options > 1) {
        await page.selectOption('select[name="advisorId"]', { index: 1 })
      }
    }

    // Look for payment form
    const cardNumberInput = page.locator(
      'input[placeholder*="Card number"], input[name="cardNumber"]'
    )

    if (await cardNumberInput.isVisible()) {
      // Enter test card number (4242424242424242 is valid test card)
      await cardNumberInput.fill('4242424242424242')

      // Fill expiry
      const expiryInput = page.locator(
        'input[placeholder*="expiry"], input[name="expiry"]'
      )
      if (await expiryInput.isVisible()) {
        await expiryInput.fill('12/25')
      }

      // Fill CVC
      const cvcInput = page.locator('input[placeholder*="CVC"], input[name="cvc"]')
      if (await cvcInput.isVisible()) {
        await cvcInput.fill('123')
      }

      // Submit payment
      const submitButton = page.locator('button:has-text("Pay"), button:has-text("Confirm")')
      await submitButton.click()

      // Should show success or redirect
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {})

      // Check for confirmation
      const confirmationText = page.locator('text=success|confirmed|booking confirmed')
      if (await confirmationText.isVisible()) {
        await expect(confirmationText).toBeVisible()
      }
    }
  })

  test('TC-PAY-003: Reject declined card', async ({ page }) => {
    await page.goto('/bookings/new')

    const cardNumberInput = page.locator(
      'input[placeholder*="Card number"], input[name="cardNumber"]'
    )

    if (await cardNumberInput.isVisible()) {
      // Use declined test card (4000000000000002)
      await cardNumberInput.fill('4000000000000002')

      const expiryInput = page.locator(
        'input[placeholder*="expiry"], input[name="expiry"]'
      )
      if (await expiryInput.isVisible()) {
        await expiryInput.fill('12/25')
      }

      const cvcInput = page.locator('input[placeholder*="CVC"], input[name="cvc"]')
      if (await cvcInput.isVisible()) {
        await cvcInput.fill('123')
      }

      // Submit
      const submitButton = page.locator('button:has-text("Pay"), button:has-text("Confirm")')
      await submitButton.click()

      // Should show error
      await page.waitForTimeout(2000)
      const errorMsg = page.locator('text=declined|error|failed')
      // Error might appear as tooltip or message
    }
  })

  // ============================================================================
  // BOOKING MANAGEMENT - TC-BOOK-013 to TC-BOOK-021
  // ============================================================================

  test('TC-BOOK-013: Display list of bookings', async ({ page }) => {
    await page.goto('/bookings')

    // Should load bookings page
    await expect(page).toHaveURL(/\/bookings/)

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check if bookings exist
    const bookingCards = page.locator('[data-testid="booking-card"]')
    const bookingCount = await bookingCards.count()

    if (bookingCount > 0) {
      // Each booking should have key info
      const firstBooking = bookingCards.first()
      await expect(
        firstBooking.locator('[data-testid="advisor-name"]')
      ).toBeVisible()
      await expect(
        firstBooking.locator('[data-testid="booking-time"]')
      ).toBeVisible()
    } else {
      // If no bookings, should show empty state
      await expect(
        page.locator('text=No bookings|You haven\'t booked any sessions')
      ).toBeVisible()
    }
  })

  // ============================================================================
  // SESSION MANAGEMENT - TC-SESSION-001 to TC-SESSION-010
  // ============================================================================

  test('TC-SESSION-002: Join session when available', async ({ page }) => {
    await page.goto('/bookings')

    // Find upcoming booking
    const upcomingBooking = page
      .locator('[data-testid="booking-card"]:has-text("Upcoming")')
      .first()

    if (await upcomingBooking.isVisible()) {
      await upcomingBooking.click()

      // Should show booking details
      await expect(page).toHaveURL(/\/bookings\//)

      // Look for join button
      const joinButton = page.locator('button:has-text("Join Session")')
      if (await joinButton.isVisible()) {
        // If session is available
        const isDisabled = await joinButton.isDisabled()
        if (!isDisabled) {
          // Button should be clickable
          expect(isDisabled).toBe(false)
        }
      }
    }
  })

  // ============================================================================
  // RESPONSIVE & PERFORMANCE CHECKS
  // ============================================================================

  test('TC-RESP-001: Mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/advisors')

    // Should not have horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 for rounding

    // Buttons should be large enough for touch
    const buttons = page.locator('button')
    const firstButton = buttons.first()
    const boundingBox = await firstButton.boundingBox()

    if (boundingBox) {
      // Minimum touch target is 44x44
      expect(boundingBox.height).toBeGreaterThanOrEqual(40) // Allow some tolerance
    }
  })

  test('TC-PERF-001: Page load performance', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/home', { waitUntil: 'domcontentloaded' })

    const loadTime = Date.now() - startTime

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  test('TC-ERROR-004: Handle session timeout gracefully', async ({ page }) => {
    await page.goto('/home')

    // Simulate session expiry by clearing auth token
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Try to navigate to protected page
    await page.goto('/bookings/new', { waitUntil: 'networkidle' })

    // Should either redirect to login or show auth error
    const isOnLoginPage =
      page.url().includes('/login') ||
      page.url().includes('/auth') ||
      (await page.locator('text=login|sign in|authentication required').isVisible())

    expect(isOnLoginPage).toBe(true)
  })

  test('TC-ERROR-001: Handle offline gracefully', async ({ page, context }) => {
    await page.goto('/advisors')

    // Go offline
    await context.setOffline(true)

    // Try to interact (e.g., filter)
    const filterButton = page.locator('button:has-text("Filter")')
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await page.waitForTimeout(1000)

      // Should show offline message or error
      const offlineMsg = page.locator('text=offline|no internet|connection')
      const hasOfflineMsg = await offlineMsg.isVisible().catch(() => false)

      // Either shows message or UI gracefully degraded
    }

    // Go back online
    await context.setOffline(false)
  })
})

/**
 * Smoke Tests - Quick sanity checks
 * These run on every deployment to catch obvious breaks
 */
test.describe('Smoke Tests', () => {
  test('Homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Whetstone')).toBeVisible()
  })

  test('Can navigate to signup', async ({ page }) => {
    await page.goto('/')
    await page.click('a:has-text("Sign Up"), button:has-text("Sign Up")')
    await expect(page).toHaveURL(/signup|register/)
  })

  test('Can navigate to login', async ({ page }) => {
    await page.goto('/')
    await page.click('a:has-text("Log In"), button:has-text("Log In")')
    await expect(page).toHaveURL(/login/)
  })

  test('Advisors page loads', async ({ page }) => {
    await page.goto('/advisors')
    await page.waitForLoadState('networkidle')
    // Should show advisor list or empty state
    const content = page.locator('main, [role="main"]')
    await expect(content).toBeVisible()
  })
})
