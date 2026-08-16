# Whetstone Client Platform - Test Cases

## Overview
Comprehensive test specification for the Whetstone customer-facing platform (client side of the marketplace). These test cases cover authentication, advisor discovery, booking flow, and account management.

**Platform Focus**: Screens 1-9 (customer routes in `src/app/(customer)/`)
**Test Framework**: Jest + React Testing Library (recommended for Next.js)
**CI/CD**: Run before each deployment

---

## 1. AUTHENTICATION FLOWS

### 1.1 Customer Sign-Up
**Route**: `GET/POST /signup`

#### TC-AUTH-001: Valid Sign-Up with All Fields
```
Given: User is on the signup page
When: User fills in email, password, and confirms password
And: All fields meet validation requirements
Then: Account is created
And: User is logged in
And: Redirected to /home
And: Email confirmation is sent
Expected: Customer profile exists in database with CUSTOMER role
```

#### TC-AUTH-002: Sign-Up with Existing Email
```
Given: An account with email "test@example.com" exists
When: User attempts to sign up with same email
Then: Error message displayed: "Email already registered"
And: No new account created
Expected: Form remains on signup page
```

#### TC-AUTH-003: Password Validation on Sign-Up
```
Validate against weak passwords:
- Empty password → Error: "Password is required"
- Password < 8 chars → Error: "Password must be at least 8 characters"
- Password != confirm password → Error: "Passwords do not match"
- Valid password: "SecureP@ss123" → Accepts
Expected: Only strong passwords are accepted
```

#### TC-AUTH-004: Email Validation on Sign-Up
```
Test email formats:
- "invalid-email" → Error: "Please enter a valid email"
- "user@" → Error: "Please enter a valid email"
- "user@example.com" → Accepts
- "user+tag@example.com" → Accepts
Expected: RFC 5322 email format validation
```

#### TC-AUTH-005: Sign-Up with Invalid Input
```
Given: User submits form with:
- Email: null/empty
- Password: null/empty
- fullName: null/empty (if required)
When: Form is submitted
Then: Validation errors displayed for each empty field
And: No account created
Expected: Clear error messages for each field
```

#### TC-AUTH-006: Concurrent Sign-Up Attempts
```
Given: User rapidly clicks sign-up submit button twice
When: Both requests are processed simultaneously
Then: Only one account is created
And: Second attempt returns error
Expected: Idempotent request handling
```

---

### 1.2 Customer Login
**Route**: `GET/POST /login`

#### TC-AUTH-007: Valid Login
```
Given: User has account with email "user@example.com", password "SecureP@ss123"
When: User enters correct credentials
Then: User is authenticated
And: Redirected to /home
And: Session/auth token is set
Expected: User is logged in and can access protected routes
```

#### TC-AUTH-008: Invalid Email on Login
```
Given: User enters email that doesn't exist
When: User submits login form
Then: Generic error message: "Invalid email or password"
And: No account enumeration leak
Expected: Error doesn't reveal if email exists
```

#### TC-AUTH-009: Wrong Password
```
Given: Correct email, incorrect password
When: User submits login form
Then: Generic error message: "Invalid email or password"
And: Multiple failed attempts trigger rate limiting
Expected: Account brute-force protection active
```

#### TC-AUTH-010: Rate Limiting on Failed Logins
```
Given: User has failed login 5+ times
When: User attempts another login
Then: Temporary account lockout (15 min)
And: Error message: "Too many login attempts. Please try again later"
Expected: Prevents brute force attacks
```

#### TC-AUTH-011: Case-Insensitive Email Login
```
Given: Account email is "User@Example.com"
When: User logs in with "user@example.com"
Then: Login succeeds
Expected: Email matching is case-insensitive
```

#### TC-AUTH-012: Login with Expired Session
```
Given: User has valid session that expired (>24h old)
When: User refreshes page or makes API request
Then: User is logged out
And: Redirected to /login
And: Message: "Your session has expired. Please log in again"
Expected: Sessions expire after configured duration
```

---

### 1.3 Password Reset
**Route**: `GET/POST /forgot-password`, `/reset-password`

#### TC-AUTH-013: Password Reset Email Request
```
Given: User is on /forgot-password
When: User enters registered email
Then: Confirmation message: "Check your email for reset instructions"
And: Reset token email is sent
And: Token expires in 1 hour
Expected: User receives valid reset link
```

#### TC-AUTH-014: Password Reset with Invalid Email
```
Given: User enters email not in system
When: User submits forgot password form
Then: Success message still shown (no enumeration leak)
And: No email sent
Expected: No information about email existence
```

#### TC-AUTH-015: Password Reset with Expired Token
```
Given: Reset token created 2 hours ago
When: User clicks link and attempts reset
Then: Error message: "This reset link has expired"
And: Redirect to /forgot-password
Expected: Tokens expire and cannot be reused
```

#### TC-AUTH-016: Password Reset with Valid Token
```
Given: User has valid reset token from email
When: User enters new password and confirms
Then: Password is updated
And: Old password no longer works
And: User is logged in
And: Email confirmation sent
Expected: Password successfully reset
```

#### TC-AUTH-017: Password Reset Token Reuse Prevention
```
Given: User resets password with token
When: User attempts to use same token again
Then: Error: "This reset link has already been used"
Expected: Tokens can only be used once
```

#### TC-AUTH-018: Password Reset Same as Old Password
```
Given: Current password is "OldPass123!"
When: User resets to "OldPass123!"
Then: Error: "New password must be different from current password"
Expected: Users can't keep same password
```

---

### 1.4 Two-Factor Authentication (MFA)
**Route**: `/mfa`

#### TC-AUTH-019: MFA Enrollment
```
Given: User is logged in
When: User enables 2FA in account settings
Then: QR code displayed for authenticator app
And: Backup codes generated (8 codes)
And: User can download/copy codes
Expected: Backup codes stored in database (hashed)
```

#### TC-AUTH-020: MFA Login with Valid Code
```
Given: MFA is enabled for user
And: User has valid 2FA code "123456" from authenticator
When: User enters code after password login
Then: User is logged in
Expected: MFA check passes
```

#### TC-AUTH-021: MFA Login with Invalid Code
```
Given: MFA is enabled
When: User enters wrong 2FA code
Then: Error: "Invalid authentication code"
And: Attempts counter incremented
Expected: Invalid codes rejected
```

#### TC-AUTH-022: MFA Login with Expired Code
```
Given: 2FA code from 60+ seconds ago
When: User enters expired code
Then: Error: "Authentication code has expired"
Expected: Time-based codes expire after 30s window
```

#### TC-AUTH-023: MFA Recovery Code Usage
```
Given: User lost access to authenticator app
When: User enters backup recovery code instead of 2FA code
Then: Code is consumed and deleted
And: User is logged in
And: Warning: "Your backup codes are limited"
Expected: Backup codes work as fallback
```

#### TC-AUTH-024: MFA Disable
```
Given: MFA is enabled for user
When: User disables 2FA in settings
Then: Requires current password confirmation
And: MFA is disabled
And: User can log in with password only
Expected: Requires re-authentication to disable
```

---

## 2. CUSTOMER DASHBOARD & HOME

### 2.1 Home Screen (Screen 1)
**Route**: `GET /home`

#### TC-HOME-001: Home Screen Load for New Customer
```
Given: New customer user with no needs/bookings
When: User navigates to /home
Then: Display welcome message
And: Call-to-action: "Create a need to find advisors"
And: Empty state shown
Expected: Proper onboarding flow visible
```

#### TC-HOME-002: Home Screen with Existing Needs
```
Given: Customer has 3 active needs
When: User navigates to /home
Then: Display list of needs with status (e.g., "3 matches found")
And: Each need is clickable → shows matches
And: Quick action buttons visible: "Create New Need", "View Bookings"
Expected: Dashboard shows customer's activity
```

#### TC-HOME-003: Home Screen Load Time
```
Given: Customer with 10+ needs and bookings
When: User navigates to /home
Then: Page loads within 2 seconds
And: Skeleton/loading state shown while fetching
Expected: Performance acceptable
```

#### TC-HOME-004: Home Screen Unauthorized Access
```
Given: Non-authenticated user
When: User navigates directly to /home
Then: Redirect to /login
And: Redirect URL preserved for post-login redirect
Expected: Protected route enforced
```

#### TC-HOME-005: Home Screen with Permissions Check
```
Given: Advisor or OPS_ADMIN user
When: They attempt to access /home
Then: Redirect to appropriate role dashboard
Expected: Role-based access control enforced
```

---

### 2.2 Upcoming Sessions / Bookings Preview
**Route**: `GET /home` (section)

#### TC-HOME-006: Display Upcoming Bookings
```
Given: Customer has booking scheduled for tomorrow
When: User views /home
Then: "Upcoming Sessions" section shows booking
And: Displays advisor name, date/time, duration
And: Shows join link (if session is starting soon)
Expected: Customer can see next session
```

#### TC-HOME-007: Join Session Button Availability
```
Given: Booking scheduled for 30 mins from now
When: User views /home
Then: "Join Session" button is enabled
Expected: Button available within 15 mins before session
```

#### TC-HOME-008: Join Session Button Disabled (Too Early)
```
Given: Booking scheduled for 2 hours from now
When: User views /home
Then: "Join Session" button is disabled (grayed out)
And: Shows message: "Available 15 minutes before session"
Expected: Button only active in appropriate window
```

---

## 3. ADVISOR DISCOVERY & SEARCH

### 3.1 Browse Advisors Landing
**Route**: `GET /advisors` (if exists) or from home

#### TC-ADVISOR-001: Load Advisor List
```
Given: Platform has 50+ verified advisors
When: User navigates to advisor discovery
Then: Display paginated list of advisors
And: Show avatar, name, headline, years experience
And: Display industry tags
And: Show hourly rate
Expected: Advisors properly formatted
```

#### TC-ADVISOR-002: Filter Advisors by Industry
```
Given: User is on advisor discovery page
When: User selects "Software Development" filter
Then: List updates to show only matching advisors
And: Filter badge shown: "Software Development ✕"
And: Result count updated: "12 advisors"
Expected: Client-side or server-side filtering works
```

#### TC-ADVISOR-003: Filter Multiple Industries
```
Given: Filters available
When: User selects multiple industries: "Software Dev" AND "Product Strategy"
Then: Show advisors matching ANY selected industry (OR logic)
And: All filter badges displayed
And: Result count accurate
Expected: Multi-select filtering works
```

#### TC-ADVISOR-004: Search Advisors by Name
```
Given: User is on advisor discovery page
When: User types "Sarah" in search box
Then: Results filtered to advisors with "Sarah" in name
And: Partial matching works (not just exact)
Expected: Name search functional
```

#### TC-ADVISOR-005: Sort Advisors - Relevance
```
Given: User has expertise in "Marketing"
When: User sorts by "Most Relevant"
Then: Advisors with Marketing expertise appear first
Expected: Relevance score calculated based on user's need
```

#### TC-ADVISOR-006: Sort Advisors - Rating
```
Given: Advisors have different ratings
When: User sorts by "Highest Rated"
Then: Advisors ordered by rating (descending)
And: Advisors with no ratings appear at bottom
Expected: Rating sort works with null handling
```

#### TC-ADVISOR-007: Sort Advisors - Price Low to High
```
Given: Advisors have rates: $150, $100, $200
When: User sorts by "Price: Low to High"
Then: Order is: $100, $150, $200
Expected: Price sorting works correctly
```

#### TC-ADVISOR-008: Pagination
```
Given: 50 advisors available, 10 per page
When: User navigates to page 2
Then: Advisors 11-20 displayed
And: Previous/Next buttons functional
And: Page indicator shown: "Page 2 of 5"
Expected: Pagination works smoothly
```

#### TC-ADVISOR-009: No Results
```
Given: User filters for "Underwater Basket Weaving"
When: No advisors match
Then: Empty state message: "No advisors found. Try different filters"
And: Suggestions to broaden search
Expected: Graceful no-results handling
```

#### TC-ADVISOR-010: Responsive Layout
```
Given: Advisor list on mobile (375px)
When: Page loads
Then: Single column layout
And: Touch targets > 44px
And: No horizontal scroll
Expected: Mobile responsive
```

---

### 3.2 View Advisor Profile
**Route**: `GET /advisors/[advisorId]`

#### TC-ADVISOR-011: Load Advisor Profile
```
Given: Valid advisor ID
When: User navigates to advisor profile
Then: Display full profile:
  - Avatar
  - Name, headline
  - Verification badge (if verified)
  - Bio/description
  - Years of experience
  - Industry specialties
  - Hourly rate
  - Average rating & review count
  - "Book Session" button
Expected: All profile sections load correctly
```

#### TC-ADVISOR-012: Advisor Verification Badge
```
Given: Advisor is verified (verification_status = VERIFIED)
When: User views profile
Then: Green checkmark badge displayed
And: Tooltip: "This advisor has been verified by Whetstone"
Expected: Verification status clearly indicated
```

#### TC-ADVISOR-013: Advisor Insurance Badge
```
Given: Advisor has active insurance coverage
When: User views profile
Then: Insurance badge displayed
And: Clicking shows coverage details
Expected: Insurance coverage visible
```

#### TC-ADVISOR-014: View Advisor Reviews
```
Given: Advisor has 5 reviews
When: User scrolls to reviews section
Then: Display latest reviews (limit 5)
And: Show rating, reviewer name, date, review text
And: "View All Reviews" link → shows all reviews
Expected: Reviews properly formatted
```

#### TC-ADVISOR-015: Review Pagination
```
Given: Advisor has 15 reviews
When: User clicks "View All Reviews"
Then: Paginate reviews (5 per page)
And: Navigation between pages works
Expected: Large review lists paginated
```

#### TC-ADVISOR-016: Advisor Availability
```
Given: Advisor has availability slots defined
When: User views profile
Then: Display "Next Available: Tomorrow at 2:00 PM"
And: Calendar showing available time slots
Expected: Availability clearly shown
```

#### TC-ADVISOR-017: Advisor Not Available
```
Given: Advisor has no available slots
When: User views profile
Then: "Not Currently Available" message shown
And: "Contact for Scheduling" button shown instead of "Book"
Expected: Communicate unavailability
```

#### TC-ADVISOR-018: Advisor Profile Load Error
```
Given: Advisor ID doesn't exist
When: User navigates to /advisors/invalid-id
Then: Error page: "Advisor not found"
And: Redirect option: "Back to Advisor Discovery"
Expected: 404 handling graceful
```

#### TC-ADVISOR-019: Advisor Profile Unauthorized
```
Given: Advisor profile is deactivated
When: User tries to view profile
Then: Error: "This advisor is no longer available"
Expected: Deactivated advisors not visible
```

#### TC-ADVISOR-020: Share Advisor Profile
```
Given: User is viewing advisor profile
When: User clicks "Share" button
Then: Options displayed: Copy Link, Email, SMS, Share to Social
And: Profile URL is shareable and works for non-logged-in users
Expected: Profiles can be shared with others
```

---

## 4. NEED INTAKE & MATCHING

### 4.1 Create Need (Screen 2)
**Route**: `GET/POST /needs/new`

#### TC-NEED-001: Load Need Creation Form
```
Given: User is on /needs/new
When: Page loads
Then: Form displayed with fields:
  - Industry (dropdown)
  - Sub-specialty (dropdown)
  - Problem area/title (text input)
  - Detailed description (textarea)
And: "Next" button (disabled until required fields filled)
Expected: Form loads with proper structure
```

#### TC-NEED-002: Create Need - All Fields Valid
```
Given: Form fields filled:
  - Industry: "Software Development"
  - Sub-specialty: "Web Development"
  - Problem area: "React Performance"
  - Description: "Help optimizing React component rendering..."
When: User clicks "Create Need"
Then: Need created in database
And: User redirected to /needs/[needId]/matches
And: Success message: "Need created! Finding advisors..."
Expected: Need successfully created
```

#### TC-NEED-003: Create Need - Missing Required Fields
```
Given: Form with empty industry field
When: User clicks "Create Need"
Then: Error message: "Please select an industry"
And: Form not submitted
Expected: Validation prevents incomplete submission
```

#### TC-NEED-004: Create Need - As Guest User
```
Given: Non-logged-in user on /needs/new
When: User fills form and submits
Then: Need created as guest need
And: Redirected to email capture step
And: Message: "Create an account to book this session"
Expected: Guest needs supported
```

#### TC-NEED-005: Need Description Validation
```
Given: Description field
When: User enters:
  - Empty: Error "Description required"
  - 1-10 chars: Error "Description must be 20+ characters"
  - Valid (20+ chars): Accepts
Expected: Description length validation
```

#### TC-NEED-006: Industry Taxonomy Hierarchy
```
Given: User selects "Business Services" (parent)
When: Sub-specialty dropdown loads
Then: Show only relevant sub-specialties: "Strategy", "Operations", etc.
And: Cannot proceed with just parent selected
Expected: Proper taxonomy filtering
```

#### TC-NEED-007: Custom Industry Input
```
Given: User cannot find matching industry
When: User clicks "Doesn't fit? Describe it"
Then: Additional field appears: "Other industries"
And: User can enter free text: "Cryptocurrency Trading"
And: Flag marked for ops review
Expected: Custom industries captured and reviewed
```

#### TC-NEED-008: Create Need - Concurrent Submissions
```
Given: User rapidly clicks "Create Need" twice
When: Both requests processed
Then: Only one need created
And: User sees single "Need created" message
Expected: Idempotent need creation
```

#### TC-NEED-009: Budget/Rate Range (If Applicable)
```
Given: User creates need
When: Optional budget field available
Then: User can specify budget: "$150-200/hour"
And: Saved with need
Expected: Budget helps matching
```

---

### 4.2 View Matches (Screen 3)
**Route**: `GET /needs/[needId]/matches`

#### TC-MATCH-001: Load Matches for Need
```
Given: Need with ID "abc123" has 5 matching advisors
When: User navigates to /needs/abc123/matches
Then: Display ranked list of matching advisors
And: Show match score/relevance percentage
And: Advisors sorted by relevance (highest first)
Expected: Matches displayed and ranked
```

#### TC-MATCH-002: Match Relevance Explanation
```
Given: Advisor matched to need
When: User hovers over relevance score
Then: Tooltip shows: "Matched due to: React expertise, 8 years experience"
And: Clicking shows full relevance breakdown
Expected: Users understand why matched
```

#### TC-MATCH-003: No Matches Found
```
Given: Need in rare niche: "Vintage Typewriter Repair"
When: No advisors match
Then: Message: "No advisors found yet for your need"
And: Options shown:
  - "Try editing your need"
  - "We'll notify you when advisors join"
Expected: Graceful no-matches handling
```

#### TC-MATCH-004: Matches Automatically Update
```
Given: Need with 2 current matches
When: New advisor joins platform with matching expertise
Then: Automatically appears in matches (within 1 min)
Expected: Real-time/near-real-time matching
```

#### TC-MATCH-005: Filter Matches by Availability
```
Given: Matches list displayed
When: User toggles "Only Show Available"
Then: Filter applied, show only advisors with available slots
And: Other advisors dimmed/hidden
Expected: Availability filtering works
```

#### TC-MATCH-006: Filter Matches by Rating
```
Given: Matches with ratings: 4.8★, 4.2★, 5.0★, no rating
When: User filters "Min Rating: 4.5★"
Then: Show only advisors with 4.5+ stars
Expected: Rating filtering works
```

#### TC-MATCH-007: Sort Matches by Price
```
Given: Multiple matches with different rates
When: User sorts "Lowest Price First"
Then: Ordered by hourly rate ascending
Expected: Price sorting works
```

#### TC-MATCH-008: Matches List Pagination
```
Given: Need has 25 matching advisors
When: Page loads with 10 advisors visible
Then: Pagination shown, page 1 of 3
And: Can navigate between pages
Expected: Large match lists paginated
```

#### TC-MATCH-009: View Advisor from Matches
```
Given: Advisor in matches list
When: User clicks advisor card
Then: Navigate to /advisors/[advisorId]
And: Can view full advisor profile
Expected: Profile accessible from matches
```

#### TC-MATCH-010: Save Need for Later
```
Given: User viewing matches
When: User clicks "Save This Need"
Then: Need saved to dashboard
And: "Saved" button state updated
And: User can access later from /home
Expected: Users can save needs for later
```

---

## 5. BOOKING FLOW

### 5.1 Initiate Booking
**Route**: `POST /bookings/new` or wizard start

#### TC-BOOK-001: Start Booking Flow
```
Given: User viewing advisor profile or match
When: User clicks "Book Session"
Then: Booking wizard started
And: Step 1 displayed: Select date/time
Expected: Booking flow initiated
```

#### TC-BOOK-002: Select Date/Time
```
Given: Booking step 1 - Date/Time selection
When: User selects available slot (e.g., "Tomorrow 2:00 PM")
Then: Slot marked as selected
And: "Next" button enabled
And: Duration shown: "1-hour session"
Expected: Date/time selection works
```

#### TC-BOOK-003: Date/Time Unavailable
```
Given: User selects time slot
When: Between selection and booking, slot becomes unavailable
Then: Warning message: "This time is no longer available"
And: Refresh available slots
And: User selects different slot
Expected: Handles race conditions gracefully
```

#### TC-BOOK-004: Timezone Selection
```
Given: User is in different timezone than advisor
When: Booking wizard displays time
Then: Time shown in user's local timezone
And: Advisor timezone shown in parentheses
And: User can change timezone preference
Expected: Proper timezone handling
```

#### TC-BOOK-005: Booking Step 2 - Refine Description
```
Given: User selected date/time
When: Step 2 displayed
Then: Text area for "What would you like to discuss?"
And: Can refine the original need description
Expected: Users can provide context
```

#### TC-BOOK-006: Booking Step 2 - Optional Attachments
```
Given: User on step 2
When: "Attach File" button clicked
Then: File picker opens
And: Can attach documents (PDF, Word, etc.)
And: Size limit: 10MB per file, max 3 files
Expected: Users can attach relevant docs
```

#### TC-BOOK-007: Booking Step 3 - Review & Confirm
```
Given: All booking details filled
When: Step 3 displayed
Then: Show summary:
  - Advisor name, avatar, hourly rate
  - Date/time
  - Duration and total cost
  - Cancellation policy
  - Insurance coverage note
And: "Confirm Booking" button
Expected: Final review before payment
```

#### TC-BOOK-008: Booking with Payment
```
Given: Booking summary displayed, total: $150
When: User clicks "Confirm Booking"
Then: Payment processing initiated
And: Stripe checkout form displayed (or modal)
And: Amount shown: $150 (+ any platform fee)
Expected: Payment required for booking
```

#### TC-BOOK-009: Booking Payment Success
```
Given: User entered valid payment info
When: Payment processed successfully
Then: Success page shown
And: Booking confirmed with ID
And: Email receipt sent
And: Redirect to /bookings/[bookingId]
Expected: Booking created after successful payment
```

#### TC-BOOK-010: Booking Payment Failure
```
Given: Payment declined (e.g., insufficient funds)
When: User attempts payment
Then: Error message: "Payment failed. Please try again"
And: Can retry with different payment method
And: Booking NOT created
Expected: Payment failures handled gracefully
```

#### TC-BOOK-011: Booking as Guest User
```
Given: Guest user completing booking
When: On Step 3 of booking
Then: Form requests email to create account
And: Offers "Create Account + Book" or "Complete as Guest"
Expected: Guest checkouts supported
```

#### TC-BOOK-012: Booking Cancellation - Guest to Paid
```
Given: Guest user completed booking
When: Booking confirmation received
Then: Account created automatically
And: Customer profile set up
And: User can log in with provided email
Expected: Guest accounts converted to registered
```

---

### 5.2 Manage Bookings
**Route**: `GET /bookings`

#### TC-BOOK-013: View Bookings List
```
Given: Logged-in customer
When: Navigate to /bookings
Then: Display all bookings:
  - Upcoming (sorted by date)
  - Past (reverse chronological)
And: Each shows: Advisor, date/time, status
Expected: All bookings visible and organized
```

#### TC-BOOK-014: Booking Status - Pending
```
Given: Booking just created
When: User views booking
Then: Status shown: "Confirmed"
And: Join link showing: "Starts in X hours"
Expected: Proper status indication
```

#### TC-BOOK-015: Booking Status - Completed
```
Given: Booking with past date
When: User views booking
Then: Status shown: "Completed"
And: Shows join recording (if saved)
And: Shows advisor's notes
And: Call-to-action: "Leave Review"
Expected: Completed bookings indicate completion
```

#### TC-BOOK-016: Booking Details
```
Given: User clicks on specific booking
When: Booking details page loads
Then: Show:
  - Advisor info (name, avatar, bio)
  - Date/time with timezone
  - Duration and total paid
  - Session link (if active)
  - Advisor's notes/prep materials
  - Chat history if messaging enabled
Expected: Full booking details available
```

#### TC-BOOK-017: Cancel Booking - Within Cancellation Window
```
Given: Booking scheduled 24 hours from now
When: User clicks "Cancel Booking"
Then: Confirmation dialog: "Refund will be issued within 3-5 days"
And: Reason dropdown (optional)
When: User confirms cancellation
Then: Booking cancelled
And: Refund processed
And: Advisor notified
Expected: Cancellations within policy window allowed
```

#### TC-BOOK-018: Cancel Booking - Outside Cancellation Window
```
Given: Booking starts in 2 hours
When: User tries to cancel
Then: Error message: "Cancellations must be 24 hours in advance"
And: "Contact support" link offered
Expected: Non-refundable policy enforced
```

#### TC-BOOK-019: Cancel Booking - Already Started
```
Given: Session currently active (started 5 mins ago)
When: User tries to cancel
Then: Error: "Cannot cancel active session"
Expected: Active sessions cannot be cancelled
```

#### TC-BOOK-020: Reschedule Booking
```
Given: Upcoming booking
When: User clicks "Reschedule"
Then: Calendar shown with new available times
When: User selects new time
Then: Booking updated
And: Both advisor and customer notified
And: No additional charge if same duration
Expected: Rescheduling supported
```

#### TC-BOOK-021: Download Booking Receipt
```
Given: Completed booking
When: User clicks "Download Receipt"
Then: PDF receipt generated
And: Contains booking details, amount paid, advisor info
And: Downloaded to device
Expected: Receipt downloadable
```

---

## 6. SESSION MANAGEMENT

### 6.1 Join Session
**Route**: Dynamic (from booking page)

#### TC-SESSION-001: Join Session - Before Start Time
```
Given: Booking starts in 30 minutes
When: User navigates to booking page
Then: "Join Session" button shown
And: Shows: "Session starts at 2:00 PM"
And: Button is disabled
Expected: Can't join before start time
```

#### TC-SESSION-002: Join Session - Within Availability Window
```
Given: Session starts in 15 minutes
When: User clicks "Join Session"
Then: Redirected to video call page
And: Video call interface loads
And: Waiting room shown until advisor joins
Expected: Session access granted 15 mins before
```

#### TC-SESSION-003: Join Session - Advisor Not Present
```
Given: User in session waiting room, advisor hasn't joined
When: 10 minutes pass
Then: "Your advisor is running late" message
And: Offer options: "Wait" or "Reschedule"
Expected: Handle advisor no-show
```

#### TC-SESSION-004: Join Session - Technical Failure
```
Given: User attempting to join
When: Video connection fails
Then: Error message: "Unable to connect to session"
And: "Retry" button or "Contact support"
Expected: Technical failures handled gracefully
```

#### TC-SESSION-005: Session Duration Limit
```
Given: Booking is 1-hour session
When: Session started and 55 minutes elapsed
Then: Warning notification: "5 minutes remaining"
Expected: Users warned of time limit
```

#### TC-SESSION-006: Session Auto-End
```
Given: 1-hour session has elapsed
When: 60 minutes from start time reached
Then: Session automatically disconnected
And: Recording ends
And: Message: "Your session has ended"
Expected: Sessions auto-terminate at end time
```

#### TC-SESSION-007: Extend Session
```
Given: Session ending in 5 minutes
When: User and advisor click "Extend Session"
Then: Options shown: Extend 15/30/60 mins
And: Cost calculated for extension
When: Confirmed
Then: Session duration extended
And: Payment charged
Expected: Session extensions supported
```

#### TC-SESSION-008: Recording Consent
```
Given: User joining session
When: Session interface loads
Then: Message: "This session may be recorded for quality purposes"
And: Checkbox: "I consent to recording"
And: Cannot proceed without consent
Expected: Recording consent required
```

#### TC-SESSION-009: Session Transcript/Recording Access
```
Given: Session completed
When: User returns to booking page
Then: "View Recording" link available (if recorded)
And: Auto-generated transcript available
And: Can download or share
Expected: Recordings and transcripts available
```

#### TC-SESSION-010: Session Chat
```
Given: User and advisor in session
When: Chat icon clicked
Then: Side panel opens with chat
And: Can send/receive messages
And: Chat persists in booking record
Expected: In-session messaging functional
```

---

## 7. PAYMENT & BILLING

### 7.1 Payment Processing
**Route**: During booking flow

#### TC-PAY-001: Stripe Payment Form
```
Given: Booking total $150
When: User on payment step
Then: Stripe form displayed
And: Fields: Card number, expiry, CVC, name, email
And: Clear amount display: "$150.00"
Expected: Payment form properly rendered
```

#### TC-PAY-002: Valid Card Payment
```
Given: Valid test card (e.g., 4242 4242 4242 4242)
When: User submits payment
Then: Payment succeeds
And: Booking confirmed
And: Confirmation email sent
Expected: Valid payments processed
```

#### TC-PAY-003: Declined Card
```
Given: Declined test card (e.g., 4000 0000 0000 0002)
When: User submits payment
Then: Error: "Card was declined"
And: User can try again
Expected: Declined cards handled gracefully
```

#### TC-PAY-004: Expired Card
```
Given: Expired test card
When: User attempts payment
Then: Error: "Card is expired"
Expected: Expired cards rejected
```

#### TC-PAY-005: 3D Secure Authentication
```
Given: Card requires 3D Secure
When: Payment submitted
Then: 3D Secure challenge modal appears
And: User completes challenge
And: Payment proceeds
Expected: 3D Secure flow supported
```

#### TC-PAY-006: Save Payment Method
```
Given: User on payment form
When: Checkbox "Save card for future bookings" checked
Then: Card saved to account
And: Next booking shows saved card option
Expected: Payment methods can be saved
```

#### TC-PAY-007: Use Saved Payment
```
Given: User has saved card on file
When: Creating new booking
Then: Option to use saved card shown
When: Selected
Then: Payment processed without re-entering details
Expected: Saved payment methods work
```

#### TC-PAY-008: View Payment History
```
Given: Customer made multiple payments
When: User navigates to Billing section (if exists)
Then: Display all transactions:
  - Date, advisor, amount, status, receipt link
Expected: Payment history available
```

#### TC-PAY-009: Refund Processing
```
Given: Booking cancelled and refund requested
When: Refund issued
Then: Original payment method credited
And: Takes 3-5 business days
And: User sees "Refund in progress" status
Expected: Refunds processed correctly
```

#### TC-PAY-010: Currency Handling
```
Given: User in different region (e.g., EUR)
When: Booking amount shown
Then: Displayed in user's local currency
And: Conversion rate shown
Expected: Multi-currency support
```

---

## 8. MESSAGING & COMMUNICATION

### 8.1 Pre-Session Messaging
**Route**: `GET /messages` or `/bookings/[bookingId]/messages`

#### TC-MSG-001: View Booking Messages
```
Given: User has booking with advisor
When: User clicks "Messages" on booking page
Then: Chat thread displayed
And: Shows all messages between customer and advisor
And: Sorted chronologically
Expected: Message history loaded
```

#### TC-MSG-002: Send Message Before Session
```
Given: Chat thread open with advisor
When: User types "I'll have some code samples to discuss"
And: Clicks Send or presses Enter
Then: Message sent and displayed immediately
And: Advisor receives notification
Expected: Messaging works before session
```

#### TC-MSG-003: Message Notifications
```
Given: User has unread message from advisor
When: New message arrives
Then: Desktop notification sent (if enabled)
And: Email notification sent (if enabled)
And: Badge count on /messages shows unread
Expected: Notifications for new messages
```

#### TC-MSG-004: Message Typing Indicator
```
Given: User watching message thread
When: Advisor starts typing
Then: "Advisor is typing..." indicator shown
Expected: Typing indicators work
```

#### TC-MSG-005: Message File Upload
```
Given: Chat thread open
When: User clicks attachment icon
Then: File picker opens
When: User selects file (PDF, image, etc.)
Then: File uploaded and appears in chat
And: Advisor can download
Expected: File sharing in messages
```

#### TC-MSG-006: Delete Message
```
Given: User has sent message
When: User clicks "Delete" on their own message
Then: Message marked "[Message deleted]"
And: Content no longer visible to both parties
Expected: Users can delete their messages
```

#### TC-MSG-007: Edit Message
```
Given: User has sent message
When: Within 15 minutes, user clicks "Edit"
Then: Message becomes editable
When: User updates and saves
Then: Message updated
And: "(Edited)" label shown
Expected: Users can edit recent messages
```

---

## 9. ACCOUNT MANAGEMENT

### 9.1 Profile Setup & Management
**Route**: `GET/POST /account`

#### TC-ACCT-001: Load Account Page
```
Given: Logged-in customer
When: Navigate to /account
Then: Display account form with fields:
  - Full name
  - Email
  - Phone (optional)
  - Avatar upload
  - Password change
  - 2FA settings
  - Notification preferences
Expected: Account page loads correctly
```

#### TC-ACCT-002: Update Profile - Name
```
Given: User on account page
When: User changes name from "John Smith" to "Jonathan Smith"
Then: Update button enabled
When: Saved
Then: Name updated in database
And: Confirmation message: "Profile updated"
Expected: Name updates work
```

#### TC-ACCT-003: Update Profile - Phone Number
```
Given: Phone field on account page
When: User enters "+61412345678"
Then: Phone number formatted/validated
When: Saved
Then: Updated in database
Expected: Phone number stored correctly
```

#### TC-ACCT-004: Update Avatar
```
Given: User clicks "Change Avatar"
When: File picker opens and selects image
Then: Image cropped/resized
And: Preview shown
When: Confirmed
Then: Avatar updated
And: Visible across platform immediately
Expected: Avatar upload and update works
```

#### TC-ACCT-005: Change Email Address
```
Given: User clicks "Change Email"
When: Requests email change to "newemail@example.com"
Then: Confirmation email sent to old address
And: Requires clicking confirmation link
When: Link clicked
Then: Email changed
And: Login now uses new email
Expected: Email change requires verification
```

#### TC-ACCT-006: Change Password
```
Given: User on account page
When: Clicks "Change Password"
Then: Modal with:
  - Current password
  - New password
  - Confirm new password
When: Valid form submitted
Then: Password updated
And: Session remains active
Expected: Password change works
```

#### TC-ACCT-007: Change Password - Wrong Current
```
Given: User entering current password incorrectly
When: Form submitted
Then: Error: "Current password is incorrect"
Expected: Current password verified
```

#### TC-ACCT-008: Notification Preferences
```
Given: Notification preferences panel
When: User unchecks "Email about new advisor matches"
Then: Setting saved
And: No longer receives emails for new matches
Expected: Notification prefs respected
```

#### TC-ACCT-009: Delete Account
```
Given: User clicks "Delete Account"
When: Confirmation dialog shown with warning
Then: Requires password confirmation
When: Confirmed
Then: Account and all associated data deleted
And: User logged out
And: Cannot log in anymore
Expected: Account deletion works (irreversible)
```

#### TC-ACCT-010: Download Personal Data
```
Given: Data privacy request
When: User clicks "Download My Data"
Then: All user data (bookings, messages, profile) compiled
And: Sent via email as JSON or CSV
Expected: GDPR data export supported
```

---

### 9.2 Saved Advisors / Favorites (If Applicable)
**Route**: Not yet specified

#### TC-ACCT-011: Save Advisor
```
Given: Viewing advisor profile
When: User clicks heart icon / "Save Advisor"
Then: Advisor saved to "Favorites"
And: Heart icon filled
And: Notification shown
Expected: Users can save advisors
```

#### TC-ACCT-012: View Saved Advisors
```
Given: User has saved 3 advisors
When: Navigate to /account/saved-advisors
Then: List of saved advisors displayed
And: Can quickly book with saved advisors
Expected: Saved advisors list accessible
```

---

## 10. ERROR HANDLING & EDGE CASES

### 10.1 Network Errors
**All routes**

#### TC-ERROR-001: Offline Mode
```
Given: User loses internet connection
When: Attempting to take action (e.g., send message)
Then: Error message: "No internet connection"
And: Action queued for retry when online
Expected: Graceful offline handling
```

#### TC-ERROR-002: Network Timeout
```
Given: API call takes >30 seconds
When: Timeout triggered
Then: Error message: "Request timed out. Please try again"
And: Retry button offered
Expected: Long operations timeout gracefully
```

#### TC-ERROR-003: API Rate Limiting
```
Given: User makes 100 requests in 1 minute
When: Rate limit triggered (429 status)
Then: Error message: "Too many requests. Please wait a moment"
And: Retry available after cooldown
Expected: Rate limiting respected
```

---

### 10.2 Session Management Errors
**All routes**

#### TC-ERROR-004: Session Expired Mid-Action
```
Given: User logged in session that expires
When: User attempts to submit a form
Then: Redirect to /login
And: After login, option to resume action
Expected: Session expiry handled gracefully
```

#### TC-ERROR-005: Concurrent Tab Sessions
```
Given: User logged in on Tab A, logs out on Tab B
When: User switches back to Tab A
Then: Session invalid
And: Redirect to /login when action attempted
Expected: Multi-tab session consistency
```

---

### 10.3 Data Validation Errors
**All routes**

#### TC-ERROR-006: XSS Prevention
```
Given: User attempts to enter: "<script>alert('xss')</script>"
When: In any text field
Then: Input sanitized/escaped
And: Script does not execute
Expected: XSS attacks prevented
```

#### TC-ERROR-007: SQL Injection Prevention
```
Given: User attempts: "' OR '1'='1"
When: In search or form field
Then: Treated as literal string
And: No database vulnerability
Expected: SQL injection prevented
```

#### TC-ERROR-008: CSRF Protection
```
Given: Form submission (e.g., payment)
When: CSRF token validated
Then: Only requests with valid token accepted
Expected: CSRF protection active
```

---

### 10.4 Concurrency & Race Conditions
**Specific operations**

#### TC-ERROR-009: Double Booking Prevention
```
Given: Advisor slot available for booking
When: Two customers simultaneously book same slot
Then: Only first booking succeeds
And: Second customer sees: "This time is no longer available"
Expected: No double bookings
```

#### TC-ERROR-010: Concurrent Payment Processing
```
Given: User rapidly clicks "Confirm" twice
When: Both payment requests submitted
Then: Only one charge applied
And: One booking created
Expected: Idempotent payments
```

#### TC-ERROR-011: Inventory Race Condition
```
Given: Last slot available with 2 concurrent bookers
When: Both attempt to book
Then: One succeeds, other fails gracefully
Expected: Inventory properly managed
```

---

## 11. ACCESSIBILITY & USABILITY

### 11.1 WCAG 2.1 Level AA Compliance

#### TC-A11Y-001: Keyboard Navigation
```
Given: User using keyboard only (no mouse)
When: Tab key used to navigate
Then: All interactive elements reachable
And: Focus indicator visible on each element
And: Enter/Space activates buttons
Expected: Full keyboard navigation
```

#### TC-A11Y-002: Screen Reader Support
```
Given: User using screen reader (NVDA/JAWS)
When: Navigating /advisors
Then: Each advisor card announced with:
  - Name
  - Rating
  - Specialties
  - Hourly rate
Expected: Screen reader friendly
```

#### TC-A11Y-003: Color Contrast
```
Given: All text on page
When: Measured for contrast ratio
Then: All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
Expected: Sufficient color contrast
```

#### TC-A11Y-004: Touch Target Size
```
Given: All clickable elements (buttons, links)
When: Measured
Then: Minimum 44x44px touch target
Expected: Adequate touch targets for mobile
```

#### TC-A11Y-005: Form Labels
```
Given: Form input fields
When: Inspected
Then: All inputs have associated <label> elements
And: Error messages linked to fields with aria-describedby
Expected: Accessible forms
```

#### TC-A11Y-006: Image Alt Text
```
Given: All images on page
When: Inspected
Then: Advisor avatars have meaningful alt text
And: Decorative images have empty alt=""
Expected: Descriptive alt text present
```

#### TC-A11Y-007: Motion & Animations
```
Given: Page with animations/transitions
When: prefers-reduced-motion is set
Then: Animations disabled or slowed
Expected: Respect accessibility preferences
```

---

### 11.2 Responsive Design

#### TC-RESP-001: Mobile (375px)
```
Given: Mobile viewport 375x667
When: Page loads
Then: Single column layout
And: Touch targets > 44px
And: No horizontal scroll
Expected: Mobile responsive
```

#### TC-RESP-002: Tablet (768px)
```
Given: Tablet viewport 768x1024
When: Page loads
Then: Optimized tablet layout
And: Proper use of screen width
Expected: Tablet responsive
```

#### TC-RESP-003: Desktop (1920px)
```
Given: Desktop viewport 1920x1080
When: Page loads
Then: Multi-column layouts used
And: No excessive line length (< 80 chars)
Expected: Desktop responsive
```

#### TC-RESP-004: Orientation Change (Portrait to Landscape)
```
Given: Mobile user in portrait mode
When: Device rotated to landscape
Then: Layout recalculates
And: All content remains accessible
Expected: Orientation changes handled
```

---

## 12. PERFORMANCE

### 12.1 Page Load Performance

#### TC-PERF-001: Home Page Load
```
Given: Clear cache, 4G network
When: /home loads
Then: First Contentful Paint < 1.5s
And: Largest Contentful Paint < 2.5s
And: Cumulative Layout Shift < 0.1
Expected: Fast page load
```

#### TC-PERF-002: Advisor List Load
```
Given: Clear cache, first visit to advisor list
When: Page loads with 50 advisors
Then: Initial load < 2s
And: Pagination works smoothly
Expected: Large lists performant
```

#### TC-PERF-003: Image Optimization
```
Given: Advisor avatars (multiple images)
When: Page loads
Then: Images lazy-loaded below fold
And: WebP format used for modern browsers
And: Proper image dimensions
Expected: Images optimized
```

#### TC-PERF-004: Code Splitting
```
Given: Application with multiple routes
When: User navigates to /advisors
Then: Only required code bundles loaded
And: No unused code for other routes
Expected: Code splitting implemented
```

---

## 13. SECURITY

### 13.1 Authentication & Authorization

#### TC-SEC-001: Password Requirements
```
Given: Password field
When: User enters weak password
Then: Rejected if < 8 chars or no mix of char types
Expected: Strong passwords enforced
```

#### TC-SEC-002: Secure Password Storage
```
Given: Database
When: Inspected for password column
Then: All passwords are hashed (bcrypt/scrypt/argon2)
And: Never stored in plaintext
Expected: Passwords securely hashed
```

#### TC-SEC-003: SSL/TLS Enforcement
```
Given: Any request to platform
When: Attempted over HTTP
Then: Redirect to HTTPS
And: HSTS header present
Expected: All traffic encrypted
```

#### TC-SEC-004: XSS Prevention
```
Given: User input in any form
When: User attempts: "<script>alert('xss')</script>"
Then: Input sanitized/escaped
And: No script execution
Expected: XSS protection
```

#### TC-SEC-005: CSRF Token Validation
```
Given: Any form submission
When: Inspected
Then: CSRF token present and validated server-side
Expected: CSRF protection active
```

#### TC-SEC-006: Secure Session Cookies
```
Given: Session cookie
When: Inspected
Then: HttpOnly flag set (no JS access)
And: Secure flag set (HTTPS only)
And: SameSite attribute set (Strict/Lax)
Expected: Secure cookie configuration
```

---

### 13.2 Data Protection

#### TC-SEC-007: Personally Identifiable Information (PII)
```
Given: Payment information (card numbers)
When: Logged or displayed
Then: Masked (e.g., "****1234")
And: Never logged in full
Expected: PII protected
```

#### TC-SEC-008: Database Encryption
```
Given: Database at rest
When: Inspected
Then: Encrypted using AES-256 or similar
Expected: Database encryption enabled
```

#### TC-SEC-009: Data Retention Policy
```
Given: User deletes account
When: Account deleted
Then: All personal data removed except legal requirements
And: No recovery possible
Expected: Data retention policy followed
```

---

## 14. COMPLIANCE & LEGAL

### 14.1 Terms & Privacy

#### TC-LEGAL-001: Terms of Service
```
Given: User on /terms
When: Page loads
Then: Full ToS displayed
And: Clear language (not legal jargon)
Expected: Terms readily accessible
```

#### TC-LEGAL-002: Privacy Policy
```
Given: User on /privacy
When: Page loads
Then: Full privacy policy displayed
And: Explains data collection and usage
Expected: Privacy policy available
```

#### TC-LEGAL-003: Signup ToS Acceptance
```
Given: Signup form
When: User creates account
Then: Must accept ToS checkbox before signup
And: Cannot proceed without acceptance
Expected: ToS acceptance enforced
```

#### TC-LEGAL-004: Cookie Consent
```
Given: First visit to site (no cookies)
When: Page loads
Then: Cookie banner displayed
And: User can "Accept All" or "Customize"
When: Customize clicked
Then: Options for analytics, marketing cookies
When: Choice made
Then: Only selected cookies set
Expected: Cookie consent banner functional
```

---

### 14.2 Insurance & Liability

#### TC-LEGAL-005: Insurance Coverage Display
```
Given: Advisor profile
When: User views profile
Then: Insurance coverage badge displayed
And: Clicking shows coverage details
And: Coverage verification date shown
Expected: Insurance transparency
```

#### TC-LEGAL-006: Insurance Claim Process
```
Given: Session completed
When: Customer files claim
Then: Process initiated through /support
And: Claim forwarded to insurance provider
Expected: Insurance claim process clear
```

---

## Test Execution Strategy

### Test Environment Setup
```bash
# Setup testing environment
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev jest-mock-extended
npm install --save-dev @types/jest
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- NeedIntakeForm.test.tsx

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Coverage Goals
- **Overall**: > 80%
- **Critical Paths** (auth, payments, bookings): > 95%
- **Components**: > 85%
- **API Routes**: > 90%

---

## Test Priorities

### P0 (Critical - Test First)
1. Authentication (signup, login, session)
2. Booking flow (complete end-to-end)
3. Payment processing
4. Session management (join, record)
5. Need creation & matching

### P1 (High - Test Soon)
1. Advisor discovery & filtering
2. Account management
3. Message/Communication
4. Booking cancellation/rescheduling
5. Error handling & edge cases

### P2 (Medium - Test Regularly)
1. Accessibility features
2. Performance metrics
3. Responsive design
4. Security validation
5. Compliance checks

### P3 (Low - Test as Resources Allow)
1. Advanced filtering options
2. Analytics tracking
3. Email notifications
4. Integration with third parties

---

## Sign-Off Checklist

- [ ] All P0 tests passing
- [ ] All P1 tests passing
- [ ] Coverage > 80%
- [ ] No critical security vulnerabilities
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Performance metrics met
- [ ] Load tested with 100+ concurrent users
- [ ] UAT completed with real users
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing on iOS/Android
- [ ] Production deployment checklist completed

---

## Contact & Support

**Test Lead**: [Your Name]
**Repository**: `jallohmo/Whetstone`
**Slack Channel**: `#whetstone-testing`
**Issues/Bugs**: GitHub Issues with label `type:bug`

Last Updated: 2026-08-16
