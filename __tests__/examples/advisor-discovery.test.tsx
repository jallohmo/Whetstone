import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvisorList } from '@/components/AdvisorList';
import { AdvisorProfile } from '@/app/(customer)/advisors/[advisorId]/page';
import { MatchesView } from '@/components/MatchesView';

/**
 * Example Advisor Discovery & Matching Tests
 * Tests for browsing advisors and matching functionality
 */

describe('Advisor Discovery', () => {
  // ============================================================================
  // ADVISOR LIST & FILTERING
  // ============================================================================

  describe('Browse Advisors', () => {
    it('TC-ADVISOR-001: Should load paginated advisor list', async () => {
      const mockAdvisors = Array.from({ length: 50 }, (_, i) => ({
        id: `advisor-${i}`,
        name: `Advisor ${i}`,
        headline: 'Expert consultant',
        yearsExperience: 10,
        hourlyRate: 100 + i * 10,
        rating: 4.5,
      }));

      render(<AdvisorList advisors={mockAdvisors} pageSize={10} />);

      // Should show first 10 advisors
      expect(screen.getByText(/Advisor 0/i)).toBeInTheDocument();
      expect(screen.getByText(/Advisor 9/i)).toBeInTheDocument();
      expect(screen.queryByText(/Advisor 10/i)).not.toBeInTheDocument();

      // Should show pagination controls
      expect(screen.getByText(/Page 1 of 5/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('TC-ADVISOR-002: Should filter by industry', async () => {
      const user = userEvent.setup();
      const mockAdvisors = [
        {
          id: 'advisor-1',
          name: 'Software Dev Expert',
          specialties: ['Software Development'],
          yearsExperience: 10,
          hourlyRate: 150,
        },
        {
          id: 'advisor-2',
          name: 'Marketing Expert',
          specialties: ['Marketing'],
          yearsExperience: 8,
          hourlyRate: 120,
        },
      ];

      render(<AdvisorList advisors={mockAdvisors} />);

      // Select "Software Development" filter
      const softwareFilter = screen.getByLabelText(/Software Development/i);
      await user.click(softwareFilter);

      // Should show only software dev advisors
      await waitFor(() => {
        expect(screen.getByText(/Software Dev Expert/i)).toBeInTheDocument();
        expect(screen.queryByText(/Marketing Expert/i)).not.toBeInTheDocument();
      });

      // Should show filter badge
      expect(screen.getByText(/Software Development/i)).toBeInTheDocument();
      expect(screen.getByText(/1 advisor/i)).toBeInTheDocument();
    });

    it('TC-ADVISOR-003: Should support multiple industry filters', async () => {
      const user = userEvent.setup();
      const mockAdvisors = [
        {
          id: 'advisor-1',
          name: 'Software Dev Expert',
          specialties: ['Software Development'],
        },
        {
          id: 'advisor-2',
          name: 'Marketing Expert',
          specialties: ['Marketing'],
        },
        {
          id: 'advisor-3',
          name: 'Sales Expert',
          specialties: ['Sales'],
        },
      ];

      render(<AdvisorList advisors={mockAdvisors} />);

      // Select multiple filters
      await user.click(screen.getByLabelText(/Software Development/i));
      await user.click(screen.getByLabelText(/Marketing/i));

      // Should show advisors matching ANY filter (OR logic)
      await waitFor(() => {
        expect(screen.getByText(/Software Dev Expert/i)).toBeInTheDocument();
        expect(screen.getByText(/Marketing Expert/i)).toBeInTheDocument();
        expect(screen.queryByText(/Sales Expert/i)).not.toBeInTheDocument();
        expect(screen.getByText(/2 advisors/i)).toBeInTheDocument();
      });
    });

    it('TC-ADVISOR-004: Should search by advisor name', async () => {
      const user = userEvent.setup();
      const mockAdvisors = [
        { id: 'advisor-1', name: 'Sarah Smith' },
        { id: 'advisor-2', name: 'John Johnson' },
        { id: 'advisor-3', name: 'Sarah Chen' },
      ];

      render(<AdvisorList advisors={mockAdvisors} />);

      const searchInput = screen.getByPlaceholderText(/search advisors/i);
      await user.type(searchInput, 'Sarah');

      // Should show advisors matching "Sarah"
      await waitFor(() => {
        expect(screen.getByText(/Sarah Smith/i)).toBeInTheDocument();
        expect(screen.getByText(/Sarah Chen/i)).toBeInTheDocument();
        expect(screen.queryByText(/John Johnson/i)).not.toBeInTheDocument();
      });
    });

    it('TC-ADVISOR-005: Should sort by relevance', async () => {
      const user = userEvent.setup();
      const mockAdvisors = [
        {
          id: 'advisor-1',
          name: 'React Expert',
          relevanceScore: 0.95,
          specialties: ['React'],
        },
        {
          id: 'advisor-2',
          name: 'PHP Expert',
          relevanceScore: 0.2,
          specialties: ['PHP'],
        },
        {
          id: 'advisor-3',
          name: 'React & Node Expert',
          relevanceScore: 0.98,
          specialties: ['React', 'Node.js'],
        },
      ];

      render(
        <AdvisorList
          advisors={mockAdvisors}
          userNeedContext={{ industry: 'Software Development', keywords: ['React'] }}
        />
      );

      // Select "Most Relevant" sort
      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'relevance');

      // Should be ordered by relevance score
      const advisorNames = screen.getAllByText(/Expert/i);
      expect(advisorNames[0]).toHaveTextContent(/React & Node/i);
      expect(advisorNames[1]).toHaveTextContent(/React Expert/i);
      expect(advisorNames[2]).toHaveTextContent(/PHP/i);
    });

    it('TC-ADVISOR-006: Should sort by rating', async () => {
      const user = userEvent.setup();
      const mockAdvisors = [
        { id: 'advisor-1', name: 'Advisor A', rating: 4.2 },
        { id: 'advisor-2', name: 'Advisor B', rating: 4.8 },
        { id: 'advisor-3', name: 'Advisor C', rating: 5.0 },
      ];

      render(<AdvisorList advisors={mockAdvisors} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'rating');

      // Should be ordered by rating (highest first)
      const advisorNames = screen.getAllByText(/Advisor/i);
      expect(advisorNames[0]).toHaveTextContent(/Advisor C/i);
      expect(advisorNames[1]).toHaveTextContent(/Advisor B/i);
      expect(advisorNames[2]).toHaveTextContent(/Advisor A/i);
    });

    it('TC-ADVISOR-007: Should sort by price', async () => {
      const user = userEvent.setup();
      const mockAdvisors = [
        { id: 'advisor-1', name: 'Advisor A', hourlyRate: 200 },
        { id: 'advisor-2', name: 'Advisor B', hourlyRate: 100 },
        { id: 'advisor-3', name: 'Advisor C', hourlyRate: 150 },
      ];

      render(<AdvisorList advisors={mockAdvisors} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'price-asc');

      // Should be ordered by price (lowest first)
      const advisorNames = screen.getAllByText(/Advisor/i);
      expect(advisorNames[0]).toHaveTextContent(/Advisor B.*100/i);
      expect(advisorNames[1]).toHaveTextContent(/Advisor C.*150/i);
      expect(advisorNames[2]).toHaveTextContent(/Advisor A.*200/i);
    });

    it('TC-ADVISOR-009: Should handle no results gracefully', async () => {
      const user = userEvent.setup();
      render(<AdvisorList advisors={[]} />);

      // Should show empty state
      expect(screen.getByText(/no advisors found/i)).toBeInTheDocument();
      expect(screen.getByText(/try different filters/i)).toBeInTheDocument();
    });

    it('TC-ADVISOR-010: Should be responsive on mobile', async () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<AdvisorList advisors={mockAdvisors} />);

      // Should render single column layout
      const advisorCards = screen.getAllByRole('article');
      const firstCard = advisorCards[0];

      // Touch targets should be large enough
      expect(firstCard).toHaveClass('w-full', 'md:w-1/2', 'lg:w-1/3');
    });
  });

  // ============================================================================
  // ADVISOR PROFILE TESTS
  // ============================================================================

  describe('Advisor Profile', () => {
    it('TC-ADVISOR-011: Should load full advisor profile', async () => {
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        headline: 'Senior React Developer',
        bio: 'Helped 100+ companies optimize their React applications',
        yearsExperience: 12,
        specialties: ['React', 'Node.js', 'Performance'],
        hourlyRate: 200,
        rating: 4.9,
        reviewCount: 45,
        verificationStatus: 'VERIFIED',
        insuranceCoverageActive: true,
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should show all profile sections
      expect(screen.getByText(/Sarah Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/Senior React Developer/i)).toBeInTheDocument();
      expect(screen.getByText(/Helped 100\+ companies/i)).toBeInTheDocument();
      expect(screen.getByText(/12 years/i)).toBeInTheDocument();
      expect(screen.getByText(/React/)).toBeInTheDocument();
      expect(screen.getByText(/\$200/i)).toBeInTheDocument();
      expect(screen.getByText(/4\.9/i)).toBeInTheDocument();
      expect(screen.getByText(/45 reviews/i)).toBeInTheDocument();
    });

    it('TC-ADVISOR-012: Should display verification badge', async () => {
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        verificationStatus: 'VERIFIED',
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should show verification badge
      const verificationBadge = screen.getByLabelText(/verified/i);
      expect(verificationBadge).toBeInTheDocument();

      // Tooltip should explain verification
      expect(screen.getByText(/advisor has been verified/i)).toBeInTheDocument();
    });

    it('TC-ADVISOR-013: Should display insurance badge', async () => {
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        insuranceCoverageActive: true,
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should show insurance badge
      expect(screen.getByText(/insured/i)).toBeInTheDocument();

      // Should be clickable for details
      const insuranceBadge = screen.getByLabelText(/insurance/i);
      expect(insuranceBadge).toBeInTheDocument();
    });

    it('TC-ADVISOR-014: Should display recent reviews', async () => {
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        reviews: [
          {
            id: 'review-1',
            rating: 5,
            reviewerName: 'John D.',
            date: '2026-08-10',
            text: 'Excellent advice on React optimization',
          },
          {
            id: 'review-2',
            rating: 4,
            reviewerName: 'Jane S.',
            date: '2026-08-08',
            text: 'Very helpful and professional',
          },
        ],
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should show recent reviews
      expect(screen.getByText(/Excellent advice on React optimization/i)).toBeInTheDocument();
      expect(screen.getByText(/Very helpful and professional/i)).toBeInTheDocument();
      expect(screen.getByText(/John D\./i)).toBeInTheDocument();
      expect(screen.getByText(/Jane S\./i)).toBeInTheDocument();
    });

    it('TC-ADVISOR-015: Should paginate large review lists', async () => {
      const user = userEvent.setup();
      const mockReviews = Array.from({ length: 15 }, (_, i) => ({
        id: `review-${i}`,
        rating: 5,
        reviewerName: `Reviewer ${i}`,
        date: '2026-08-10',
        text: `Review ${i}`,
      }));

      render(<AdvisorProfile advisorId="advisor-123" advisor={{ reviews: mockReviews }} />);

      // Should show only first 5 reviews
      expect(screen.getByText(/Reviewer 0/i)).toBeInTheDocument();
      expect(screen.getByText(/Reviewer 4/i)).toBeInTheDocument();
      expect(screen.queryByText(/Reviewer 5/i)).not.toBeInTheDocument();

      // Should have "View All Reviews" link
      const viewAllButton = screen.getByRole('button', { name: /view all reviews/i });
      await user.click(viewAllButton);

      // Should show all reviews
      await waitFor(() => {
        expect(screen.getByText(/Reviewer 14/i)).toBeInTheDocument();
      });
    });

    it('TC-ADVISOR-016: Should display availability', async () => {
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        nextAvailable: '2026-08-17T14:00:00Z',
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should show next available time
      expect(screen.getByText(/next available.*tomorrow.*2:00 pm/i)).toBeInTheDocument();

      // Should show availability calendar
      expect(screen.getByText(/available time slots/i)).toBeInTheDocument();
    });

    it('TC-ADVISOR-017: Should handle unavailable advisor', async () => {
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        availabilitySlots: [],
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should show unavailability message
      expect(screen.getByText(/not currently available/i)).toBeInTheDocument();

      // Should offer contact option instead of book button
      expect(screen.queryByRole('button', { name: /book/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /contact for scheduling/i })).toBeInTheDocument();
    });

    it('TC-ADVISOR-018: Should handle nonexistent advisor', async () => {
      render(<AdvisorProfile advisorId="nonexistent-id" />);

      // Should show 404 message
      expect(screen.getByText(/advisor not found/i)).toBeInTheDocument();

      // Should offer navigation back
      expect(screen.getByRole('link', { name: /back to advisors/i })).toBeInTheDocument();
    });

    it('TC-ADVISOR-019: Should handle deactivated advisor', async () => {
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        deactivatedAt: '2026-08-01',
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should show unavailability message
      expect(screen.getByText(/advisor is no longer available/i)).toBeInTheDocument();
    });

    it('TC-ADVISOR-020: Should allow sharing profile', async () => {
      const user = userEvent.setup();
      const mockAdvisor = {
        id: 'advisor-123',
        name: 'Sarah Smith',
        profileUrl: 'https://whetstone.com/advisors/advisor-123',
      };

      render(<AdvisorProfile advisorId={mockAdvisor.id} advisor={mockAdvisor} />);

      // Should have share button
      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      // Should show share options
      expect(screen.getByText(/copy link/i)).toBeInTheDocument();
      expect(screen.getByText(/share.*email/i)).toBeInTheDocument();
      expect(screen.getByText(/share.*sms/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // MATCHING TESTS
  // ============================================================================

  describe('Advisor Matching', () => {
    it('TC-MATCH-001: Should display ranked matches', async () => {
      const mockMatches = [
        {
          id: 'advisor-1',
          name: 'Sarah Smith',
          matchScore: 0.98,
          relevanceReason: 'Expert in React',
        },
        {
          id: 'advisor-2',
          name: 'John Doe',
          matchScore: 0.85,
          relevanceReason: 'Has JavaScript experience',
        },
        {
          id: 'advisor-3',
          name: 'Jane Chen',
          matchScore: 0.72,
          relevanceReason: 'Relevant industry experience',
        },
      ];

      render(<MatchesView matches={mockMatches} />);

      // Should display ranked by match score
      const advisorNames = screen.getAllByText(/(Sarah|John|Jane)/);
      expect(advisorNames[0]).toHaveTextContent(/Sarah Smith.*98/i);
      expect(advisorNames[1]).toHaveTextContent(/John Doe.*85/i);
      expect(advisorNames[2]).toHaveTextContent(/Jane Chen.*72/i);
    });

    it('TC-MATCH-002: Should explain match relevance', async () => {
      const user = userEvent.setup();
      const mockMatches = [
        {
          id: 'advisor-1',
          name: 'Sarah Smith',
          matchScore: 0.98,
          relevanceReason: 'Expert in React, 12 years experience',
        },
      ];

      render(<MatchesView matches={mockMatches} />);

      // Hover over relevance score
      const relevanceScore = screen.getByText(/98/);
      await user.hover(relevanceScore);

      // Should show tooltip/explanation
      await waitFor(() => {
        expect(screen.getByText(/Expert in React.*12 years/i)).toBeInTheDocument();
      });
    });

    it('TC-MATCH-003: Should handle no matches', async () => {
      render(<MatchesView matches={[]} />);

      // Should show empty state
      expect(screen.getByText(/no advisors found/i)).toBeInTheDocument();
      expect(screen.getByText(/try editing your need/i)).toBeInTheDocument();
      expect(screen.getByText(/we.*ll notify you/i)).toBeInTheDocument();
    });

    it('TC-MATCH-005: Should filter matches by availability', async () => {
      const user = userEvent.setup();
      const mockMatches = [
        { id: 'advisor-1', name: 'Available Advisor', available: true },
        { id: 'advisor-2', name: 'Unavailable Advisor', available: false },
      ];

      render(<MatchesView matches={mockMatches} />);

      // Toggle "Only Show Available"
      const availabilityFilter = screen.getByLabelText(/only show available/i);
      await user.click(availabilityFilter);

      // Should filter out unavailable advisors
      await waitFor(() => {
        expect(screen.getByText(/Available Advisor/i)).toBeInTheDocument();
        expect(screen.queryByText(/Unavailable Advisor/i)).not.toBeInTheDocument();
      });
    });

    it('TC-MATCH-006: Should filter matches by rating', async () => {
      const user = userEvent.setup();
      const mockMatches = [
        { id: 'advisor-1', name: 'High Rated', rating: 4.8 },
        { id: 'advisor-2', name: 'Medium Rated', rating: 4.2 },
        { id: 'advisor-3', name: 'Low Rated', rating: 3.5 },
      ];

      render(<MatchesView matches={mockMatches} />);

      // Select minimum rating filter: 4.5
      const ratingFilter = screen.getByLabelText(/min rating/i);
      await user.selectOptions(ratingFilter, '4.5');

      // Should show only high-rated advisors
      await waitFor(() => {
        expect(screen.getByText(/High Rated/i)).toBeInTheDocument();
        expect(screen.queryByText(/Medium Rated/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Low Rated/i)).not.toBeInTheDocument();
      });
    });

    it('TC-MATCH-007: Should sort matches by price', async () => {
      const user = userEvent.setup();
      const mockMatches = [
        { id: 'advisor-1', name: 'Expensive', hourlyRate: 200 },
        { id: 'advisor-2', name: 'Budget', hourlyRate: 100 },
        { id: 'advisor-3', name: 'Mid-range', hourlyRate: 150 },
      ];

      render(<MatchesView matches={mockMatches} />);

      // Sort by price
      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'price-asc');

      // Should be ordered by price
      const advisorNames = screen.getAllByText(/(Budget|Mid-range|Expensive)/);
      expect(advisorNames[0]).toHaveTextContent(/Budget/i);
      expect(advisorNames[1]).toHaveTextContent(/Mid-range/i);
      expect(advisorNames[2]).toHaveTextContent(/Expensive/i);
    });
  });
});
