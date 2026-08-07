import { PageHeader, Card, Input, Button, ScaffoldNote } from "@/components/ui";

// Screen 8 — In-session messaging (A7). Simple thread, no read receipts/typing
// indicators at MVP. Can run on polling or Supabase Realtime (deferred choice).
export default function MessagesPage({
  params,
}: {
  params: { bookingId: string };
}) {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Messages" subtitle="Keep it here so everything stays on the record for your session." />
      <Card className="p-0">
        <div className="flex min-h-[280px] flex-col gap-3 p-card">
          <div className="max-w-[80%] self-start rounded-lg rounded-bl-xs bg-gray-100 px-3 py-2 text-body text-ink">
            Looking forward to it — send over anything you want me to look at beforehand.
          </div>
          <div className="max-w-[80%] self-end rounded-lg rounded-br-xs bg-ink px-3 py-2 text-body text-white">
            Will do, thanks.
          </div>
        </div>
        <form className="flex gap-2 border-t border-gray-200 p-3">
          <Input placeholder="Write a message…" />
          <Button type="submit">Send</Button>
        </form>
      </Card>
      <div className="mt-6">
        <ScaffoldNote>
          Thread for booking <code className="font-mono">{params.bookingId}</code>. Reads/writes the
          Message table; both parties on the booking can access it (RLS on{" "}
          <code className="font-mono">bookings</code>/messages).
        </ScaffoldNote>
      </div>
    </div>
  );
}
