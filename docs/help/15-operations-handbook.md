# The operations handbook

*For the Whetstone team. Ops accounts are created internally — you can't sign up
for one.*

You are the part of Whetstone that isn't software. Advisors are trusted because
you checked them; shortlists are good because you read the challenge; disputes end
fairly because you looked. Three jobs, one queue.

## The queue

Your dashboard is a single list of everything waiting on a person, oldest first,
colour-tagged by type:

| Tag | What it is | Where it goes |
|---|---|---|
| **Application** | An advisor awaiting verification, or one who resubmitted after being asked for more information | The verification screen |
| **Need** | A business owner's challenge with no shortlist sent yet | The matching workbench |
| **Flag** | A problem reported on a booking | The dispute screen |

An empty queue is the goal state. Anything sitting there is a person waiting.

---

## Verifying advisors

An advisor is invisible and unbookable until you approve them. This is the
platform's core promise — treat it as such.

### What you're checking

1. **Identity** — the uploaded ID document is genuine and matches the applicant.
2. **Credentials** — the licences, registrations and memberships they claim are
   real and current. Check with the issuing body, not the certificate.
3. **Background** — a reference call about the experience they describe. Does the
   career they've written match the one someone else describes?

Nothing is automatic in either direction. A failed automated check is a reason to
look harder, never a reason to reject on its own.

### Recording the decision

Pick the evidence type (reference call, licence check, ID check, or general
review), then one of:

- **Approve** — they become visible and bookable. Approving an *ID check*
  specifically also clears the identity gate on their profile.
- **Needs more information** — sends them back to fix and resubmit, which returns
  them to your queue.
- **Reject** — the application isn't accepted.

**A note is mandatory on every decision.** The screen won't proceed without one,
and that's deliberate: a status without a reason is not evidence. Write what you
checked, who you spoke to, and what convinced you. Assume it will be read a year
from now by someone handling a complaint.

Every decision creates a permanent record against that advisor, stamped with who
made it.

### Watch for

- Credentials in a field adjacent to what they want to advise on
- Long gaps or vague periods in the described career
- Specialty selections much broader than the evidence supports
- Anything in the "something not listed" box that's actually a red flag rather
  than a taxonomy gap

### Taxonomy gaps

When an applicant writes something real into "something not listed", that's a
signal to extend the industry list — not a reason to squeeze them into the wrong
category.

---

## Matching a challenge to advisors

The matching workbench shows the client's challenge and their industry alongside
the verified advisors available.

### How to do it

1. **Read the whole description**, not the headline. The headline says
   "pricing"; the description says the real problem is a customer who's 60% of
   revenue.
2. **Tick everyone you considered.** Not just the ones you chose.
3. **Choose one advisor**, and **write the reason.**
4. Submit. That adds *one* advisor to the shortlist and **does not notify the
   client** — deliberately, because you're usually adding two or three.
5. Repeat for each advisor.
6. When the shortlist is complete, **send it to the client**. That's the separate,
   explicit step that flips the challenge to matched and sends their email.

You can't send an empty shortlist, and sending is safe to double-click — the
client is emailed exactly once, even if two of you press it at the same moment.

### Writing the reason

The client reads this. It's the difference between a list of strangers and a set
of introductions.

Weak: *"Experienced in retail."*

Strong: *"Ran three cafés through a franchise transition and spent four years on
the other side of the table negotiating supplier terms — which is exactly the
squeeze you described."*

Name the specific thing in their situation and the specific thing in the
advisor's career, and connect them.

### Why "considered" matters

The list of advisors you considered, the one you chose, and your reason are stored
together as a permanent decision record. That record is how Whetstone learns which
matches actually work — read alongside the outcome surveys clients fill in later.
Skipping the considered list quietly destroys that.

### Judgement calls

- **Nobody fits.** Don't force it. Tell the client honestly and say when you
  expect to have someone, or ask a clarifying question.
- **The client came back unhappy with a shortlist.** Ask what missed before
  rebuilding it.
- **A brand-new verified advisor.** Shortlist them where their experience genuinely
  fits — the reason you write is what earns them the first booking, not a rating
  they don't have yet.

---

## Handling disputes

A flag means a booking is frozen and no money is moving. Both parties are waiting
on you.

### The process

1. **Read everything on the booking** — the scope that was agreed, the message
   thread, the recorded session outcomes, and the reported problem.
2. **Talk to both sides.** The report is one account; get the other.
3. **Anchor on the scope.** The written scope copied onto the booking is what was
   agreed. Most disputes are a mismatch between that and one side's expectations.
4. **Decide.**

### The two outcomes

**Resolve** — the engagement stands. The booking is marked complete and the
advisor's held payment is released. Use this when the work was delivered as
scoped.

**Refund** — the client's money goes back and the booking is cancelled. Use this
when the work wasn't delivered, or was outside what was sold.

**Escalate** — for cases you shouldn't decide alone: allegations of misconduct,
anything with a legal or insurance dimension, or a pattern across several
bookings by the same person. The booking stays frozen.

Whichever you choose, add a note. It's appended permanently to the dispute record.

### Principles

- **Speed is part of fairness.** Both parties are stuck while this sits.
- **Write to be read by both sides.** Assume your note will be seen by them.
- **The advisor's session outcome records are evidence.** So is silence in a
  message thread.
- **Look for patterns.** One bad session is a bad session. Three from the same
  advisor is a verification problem.

---

## Things worth knowing

**Payment states.** Money is *held* from checkout until release. It's released by
the client confirming completion, by the automatic seven-day acceptance, or by
you resolving a dispute. Refunding is the alternative and can't be combined with
releasing.

**The automatic sweeps.** A nightly job moves confirmed bookings to *in progress*
once their first session has started, sends the day-3 completion reminder, and
auto-accepts at day 7. Reminder emails go out 24 hours and 1 hour before each
session. All of these send exactly once, so you won't be spamming anyone by
re-running something.

**Reading a thread.** You can read the messages on a booking when handling a
problem. You **cannot post** in a client/advisor thread — the platform blocks it.
Contact either party by email instead.

**Insurance.** If coverage were ever marked inactive, the platform refuses new
payments outright. That's a hard stop, not a warning.
