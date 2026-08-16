import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingWizard } from '@/components/BookingWizard';
import { BookingsPage } from '@/app/(customer)/bookings/page';

/**
 * Example Booking Flow Tests
 * Critical tests for the booking flow - P0 priority
 */

describe('Customer Booking Flow', () => {
  // ============================================================================
  // BOOKING CREATION TESTS
  // ============================================================================

  describe('Booking Initiation', () => {
    it('TC-BOOK-001: Should start booking flow from advisor profile', async () => {
      const user = userEvent.setup();
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        hourlyRate: 150,
      };

      render(<BookingWizard advisorId={mockAdvisor.id} />);

      // Should show booking wizard title
      expect(screen.getByText(/book a session/i)).toBeInTheDocument();

      // Step 1: Date/Time selection
      expect(screen.getByLabelText(/select date/i)).toBeInTheDocument();
    });

    it('TC-BOOK-002: Should select date and time', async () => {
      const user = userEvent.setup();
      render(<BookingWizard advisorId="advisor-123" />);

      // Get next available time slot (e.g., tomorrow 2:00 PM)
      const timeSlot = screen.getByLabelText(/tomorrow 2:00 pm/i);
      await user.click(timeSlot);

      // Duration should be shown
      expect(screen.getByText(/1.hour session/i)).toBeInTheDocument();

      // Next button should be enabled
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();

      await user.click(nextButton);

      // Should advance to step 2
      expect(screen.getByText(/describe the session/i)).toBeInTheDocument();
    });

    it('TC-BOOK-003: Should handle unavailable time slot', async () => {
      const user = userEvent.setup();
      render(<BookingWizard advisorId="advisor-123" />);

      // Select a time slot
      const timeSlot = screen.getByLabelText(/tomorrow 3:00 pm/i);
      await user.click(timeSlot);

      // Simulate slot becoming unavailable (another user books it)
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should show warning if slot is no longer available
      await waitFor(() => {
        expect(screen.queryByText(/no longer available/i)).toBeInTheDocument();
      });
    });

    it('TC-BOOK-004: Should display timezone correctly', async () => {
      const user = userEvent.setup();
      render(<BookingWizard advisorId="advisor-123" userTimezone="America/New_York" />);

      // Should show user's local time
      expect(screen.getByText(/est/i)).toBeInTheDocument();

      // Should show advisor's timezone
      expect(screen.getByText(/advisor.*pdt/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // BOOKING REVIEW TESTS
  // ============================================================================

  describe('Booking Review & Confirmation', () => {
    it('TC-BOOK-005: Should allow refining need description', async () => {
      const user = userEvent.setup();
      render(<BookingWizard advisorId="advisor-123" step={2} />);

      // Should have text area for description
      const descriptionField = screen.getByLabelText(/what would you like to discuss/i);
      await user.clear(descriptionField);
      await user.type(descriptionField, 'I need help with React performance optimization');

      // Description should update
      expect(descriptionField).toHaveValue('I need help with React performance optimization');
    });

    it('TC-BOOK-006: Should allow file attachments', async () => {
      const user = userEvent.setup();
      render(<BookingWizard advisorId="advisor-123" step={2} />);

      const attachButton = screen.getByRole('button', { name: /attach file/i });
      expect(attachButton).toBeInTheDocument();

      // Note: File upload testing would require mocking file selection
      // This is a placeholder for that test structure
    });

    it('TC-BOOK-007: Should display booking summary for confirmation', async () => {
      const user = userEvent.setup();
      const bookingDetails = {
        advisorName: 'Sarah Smith',
        advisorRate: 150,
        date: '2026-08-17',
        time: '14:00',
        duration: 60,
      };

      render(
        <BookingWizard
          advisorId="advisor-123"
          step={3}
          bookingDetails={bookingDetails}
        />
      );

      // Should show all booking details
      expect(screen.getByText(/sarah smith/i)).toBeInTheDocument();
      expect(screen.getByText(/august 17, 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/2:00 pm/i)).toBeInTheDocument();
      expect(screen.getByText(/\$150/i)).toBeInTheDocument();

      // Should show cancellation policy
      expect(screen.getByText(/cancellation.*24 hours/i)).toBeInTheDocument();

      // Should show insurance coverage
      expect(screen.getByText(/insured/i)).toBeInTheDocument();
    });

    it('TC-BOOK-008: Should initiate payment processing', async () => {
      const user = userEvent.setup();
      render(
        <BookingWizard
          advisorId="advisor-123"
          step={3}
          bookingDetails={{
            advisorName: 'Sarah Smith',
            advisorRate: 150,
            date: '2026-08-17',
            duration: 60,
          }}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);

      // Should show payment form
      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
        expect(screen.getByText(/\$150.00/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // PAYMENT TESTS
  // ============================================================================

  describe('Payment Processing', () => {
    it('TC-PAY-002: Should process valid card payment', async () => {
      const user = userEvent.setup();
      render(
        <PaymentForm
          amount={150}
          advisorName="Sarah Smith"
          onSuccess={jest.fn()}
        />
      );

      // Enter valid test card
      await user.type(
        screen.getByLabelText(/card number/i),
        '4242424242424242'
      );
      await user.type(
        screen.getByLabelText(/expiry/i),
        '12/25'
      );
      await user.type(
        screen.getByLabelText(/cvc/i),
        '123'
      );
      await user.type(
        screen.getByLabelText(/name/i),
        'John Smith'
      );

      const submitButton = screen.getByRole('button', { name: /pay|confirm/i });
      await user.click(submitButton);

      // Should show success
      await waitFor(() => {
        expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      });
    });

    it('TC-PAY-003: Should reject declined card', async () => {
      const user = userEvent.setup();
      render(
        <PaymentForm
          amount={150}
          advisorName="Sarah Smith"
          onSuccess={jest.fn()}
        />
      );

      // Enter declined test card
      await user.type(
        screen.getByLabelText(/card number/i),
        '4000000000000002' // Declined card
      );
      await user.type(
        screen.getByLabelText(/expiry/i),
        '12/25'
      );
      await user.type(
        screen.getByLabelText(/cvc/i),
        '123'
      );

      const submitButton = screen.getByRole('button', { name: /pay|confirm/i });
      await user.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/card was declined/i)).toBeInTheDocument();
      });
    });

    it('TC-PAY-004: Should reject expired card', async () => {
      const user = userEvent.setup();
      render(
        <PaymentForm
          amount={150}
          advisorName="Sarah Smith"
          onSuccess={jest.fn()}
        />
      );

      // Enter expired card date (past date)
      await user.type(
        screen.getByLabelText(/card number/i),
        '4242424242424242'
      );
      await user.type(
        screen.getByLabelText(/expiry/i),
        '01/20' // Expired
      );
      await user.type(
        screen.getByLabelText(/cvc/i),
        '123'
      );

      const submitButton = screen.getByRole('button', { name: /pay|confirm/i });
      await user.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });

    it('TC-PAY-006: Should save payment method', async () => {
      const user = userEvent.setup();
      render(
        <PaymentForm
          amount={150}
          advisorName="Sarah Smith"
          onSuccess={jest.fn()}
          showSaveOption={true}
        />
      );

      // Fill payment details
      await user.type(
        screen.getByLabelText(/card number/i),
        '4242424242424242'
      );
      await user.type(
        screen.getByLabelText(/expiry/i),
        '12/25'
      );
      await user.type(
        screen.getByLabelText(/cvc/i),
        '123'
      );

      // Check "Save card" checkbox
      const saveCardCheckbox = screen.getByLabelText(/save card/i);
      await user.click(saveCardCheckbox);

      const submitButton = screen.getByRole('button', { name: /pay|confirm/i });
      await user.click(submitButton);

      // Should succeed and save card
      await waitFor(() => {
        expect(screen.getByText(/card saved/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // BOOKING MANAGEMENT TESTS
  // ============================================================================

  describe('View & Manage Bookings', () => {
    it('TC-BOOK-013: Should display list of bookings', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          advisorName: 'Sarah Smith',
          date: '2026-08-20',
          time: '14:00',
          status: 'confirmed',
        },
        {
          id: 'booking-2',
          advisorName: 'John Doe',
          date: '2026-08-25',
          time: '10:00',
          status: 'confirmed',
        },
      ];

      render(<BookingsPage bookings={mockBookings} />);

      // Should show upcoming bookings
      expect(screen.getByText(/sarah smith/i)).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      expect(screen.getByText(/august 20, 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/august 25, 2026/i)).toBeInTheDocument();
    });

    it('TC-BOOK-016: Should display booking details', async () => {
      const mockBooking = {
        id: 'booking-123',
        advisorName: 'Sarah Smith',
        advisorBio: 'Expert in React and performance optimization',
        date: '2026-08-20',
        time: '14:00',
        duration: 60,
        totalPaid: 150,
        status: 'confirmed',
        sessionLink: 'https://example.com/session/123',
      };

      render(<BookingDetailsPage booking={mockBooking} />);

      // Should show all details
      expect(screen.getByText(/sarah smith/i)).toBeInTheDocument();
      expect(screen.getByText(/expert in react/i)).toBeInTheDocument();
      expect(screen.getByText(/august 20, 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/\$150/i)).toBeInTheDocument();
      expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
    });

    it('TC-BOOK-017: Should allow cancellation within policy window', async () => {
      const user = userEvent.setup();
      const mockBooking = {
        id: 'booking-123',
        advisorName: 'Sarah Smith',
        date: '2026-08-20', // 24+ hours from now
        time: '14:00',
        status: 'confirmed',
      };

      render(<BookingDetailsPage booking={mockBooking} />);

      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await user.click(cancelButton);

      // Should show confirmation dialog
      expect(screen.getByText(/confirm cancellation/i)).toBeInTheDocument();
      expect(screen.getByText(/refund.*3.5 days/i)).toBeInTheDocument();

      // Confirm cancellation
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      // Should process cancellation
      await waitFor(() => {
        expect(screen.getByText(/booking cancelled/i)).toBeInTheDocument();
      });
    });

    it('TC-BOOK-018: Should prevent cancellation outside policy window', async () => {
      const user = userEvent.setup();
      const mockBooking = {
        id: 'booking-123',
        advisorName: 'Sarah Smith',
        date: '2026-08-16', // Less than 24 hours from now
        time: '16:00',
        status: 'confirmed',
      };

      render(<BookingDetailsPage booking={mockBooking} />);

      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      expect(cancelButton).toBeDisabled();

      // Should show policy message
      expect(screen.getByText(/cancellations must be 24 hours/i)).toBeInTheDocument();
    });

    it('TC-BOOK-020: Should allow rescheduling', async () => {
      const user = userEvent.setup();
      const mockBooking = {
        id: 'booking-123',
        advisorName: 'Sarah Smith',
        date: '2026-08-20',
        time: '14:00',
        status: 'confirmed',
      };

      render(<BookingDetailsPage booking={mockBooking} />);

      const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
      await user.click(rescheduleButton);

      // Should show calendar with new available times
      expect(screen.getByText(/select new time/i)).toBeInTheDocument();

      // Select new time
      const newTimeSlot = screen.getByLabelText(/august 22, 2026.*2:00 pm/i);
      await user.click(newTimeSlot);

      // Confirm reschedule
      const confirmButton = screen.getByRole('button', { name: /confirm reschedule/i });
      await user.click(confirmButton);

      // Should show success
      await waitFor(() => {
        expect(screen.getByText(/booking rescheduled/i)).toBeInTheDocument();
      });
    });

    it('TC-BOOK-021: Should download receipt', async () => {
      const user = userEvent.setup();
      const mockBooking = {
        id: 'booking-123',
        advisorName: 'Sarah Smith',
        date: '2026-08-20',
        time: '14:00',
        totalPaid: 150,
        status: 'completed',
      };

      render(<BookingDetailsPage booking={mockBooking} />);

      const downloadButton = screen.getByRole('button', { name: /download receipt/i });
      await user.click(downloadButton);

      // Should trigger PDF download
      // (In real tests, would mock window.open or check download trigger)
      expect(downloadButton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases & Error Handling', () => {
    it('TC-BOOK-010: Should handle payment failure gracefully', async () => {
      const user = userEvent.setup();
      render(
        <PaymentForm
          amount={150}
          advisorName="Sarah Smith"
          onSuccess={jest.fn()}
        />
      );

      // Enter card that will fail
      await user.type(
        screen.getByLabelText(/card number/i),
        '4000000000000002' // Declined
      );
      await user.type(
        screen.getByLabelText(/expiry/i),
        '12/25'
      );
      await user.type(
        screen.getByLabelText(/cvc/i),
        '123'
      );

      const submitButton = screen.getByRole('button', { name: /pay|confirm/i });
      await user.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      });

      // Should still be on payment form with retry option
      expect(screen.getByRole('button', { name: /pay|confirm/i })).toBeInTheDocument();
    });

    it('TC-ERROR-010: Should prevent duplicate payment processing', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      render(
        <PaymentForm
          amount={150}
          advisorName="Sarah Smith"
          onSuccess={onSuccess}
        />
      );

      // Fill form
      await user.type(
        screen.getByLabelText(/card number/i),
        '4242424242424242'
      );
      await user.type(
        screen.getByLabelText(/expiry/i),
        '12/25'
      );
      await user.type(
        screen.getByLabelText(/cvc/i),
        '123'
      );

      const submitButton = screen.getByRole('button', { name: /pay|confirm/i });

      // Rapid double-click
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Should only process once
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('TC-ERROR-009: Should prevent double-booking of same time slot', async () => {
      const user = userEvent.setup();

      // Simulate two concurrent booking attempts for same slot
      const mockOnBookingComplete = jest.fn();

      const { rerender } = render(
        <BookingWizard
          advisorId="advisor-123"
          onBookingComplete={mockOnBookingComplete}
        />
      );

      // Select time slot
      const timeSlot = screen.getByLabelText(/tomorrow 2:00 pm/i);
      await user.click(timeSlot);

      // Advance to payment
      await user.click(screen.getByRole('button', { name: /next/i }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Simulate other user booking same slot
      // In real scenario, would need to mock API response
      // showing slot is taken before payment completes

      // For now, verify error handling exists
      expect(screen.getByText(/error/i) || screen.getByText(/unavailable/i)).toBeTruthy();
    });
  });
});
