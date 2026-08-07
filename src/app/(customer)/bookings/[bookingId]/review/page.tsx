import { PageHeader, Card } from "@/components/ui";
import { PostSessionSurvey } from "@/components/customer/PostSessionSurvey";

// Screen 9 — Post-session review/survey (B3, C2).
export default function ReviewPage({
  params,
}: {
  params: { bookingId: string };
}) {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="How did it go?" subtitle="Takes 20 seconds. It helps the next person get matched to the right advisor." />
      <Card>
        <PostSessionSurvey bookingId={params.bookingId} />
      </Card>
    </div>
  );
}
