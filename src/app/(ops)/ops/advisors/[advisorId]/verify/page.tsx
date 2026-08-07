import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { reviewAdvisor } from "@/lib/actions/verification";
import { VerificationBadge } from "@/components/shared/VerificationBadge";

// Screen 17 — Verification review (B1, B2). Profile, prior evidence trail, and
// uploaded credential documents in one place for a fast approve / reject /
// request-more-info decision. Each decision writes a VerificationRecord.
export default async function OpsVerifyPage({
  params,
}: {
  params: { advisorId: string };
}) {
  const advisor = await prisma.advisorProfile.findUnique({
    where: { id: params.advisorId },
    include: {
      user: true,
      specialtyTags: true,
      verificationRecords: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!advisor) notFound();

  // Uploaded credential/ID documents live under `<userId>/` in the private bucket.
  let docs: { name: string; url: string | null }[] = [];
  try {
    const supabase = createClient();
    const { data: files } = await supabase.storage
      .from("advisor-credentials")
      .list(advisor.userId, { limit: 100 });
    docs = await Promise.all(
      (files ?? []).map(async (f) => {
        const { data } = await supabase.storage
          .from("advisor-credentials")
          .createSignedUrl(`${advisor.userId}/${f.name}`, 600);
        return { name: f.name, url: data?.signedUrl ?? null };
      }),
    );
  } catch {
    docs = [];
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink">{advisor.user.email}</h1>
        <VerificationBadge status={advisor.verificationStatus} size="sm" />
      </div>
      <p className="mb-4 font-mono text-gray-500">{advisor.id}</p>

      {/* Profile */}
      <section className="mb-4 rounded-md border border-gray-300 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Application</h2>
        <dl className="space-y-2 text-[13px]">
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 text-gray-500">Headline</dt>
            <dd className="text-ink">{advisor.headline ?? "—"}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 text-gray-500">Experience</dt>
            <dd className="text-ink">{advisor.yearsExperience} years</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 text-gray-500">Specialties</dt>
            <dd className="text-ink">{advisor.specialtyTags.map((t) => t.name).join(", ") || "—"}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 text-gray-500">Bio</dt>
            <dd className="text-ink">{advisor.bio}</dd>
          </div>
        </dl>
      </section>

      {/* Documents */}
      <section className="mb-4 rounded-md border border-gray-300 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Uploaded documents</h2>
        {docs.length === 0 ? (
          <p className="text-[13px] text-gray-500">No documents uploaded.</p>
        ) : (
          <ul className="space-y-1 text-[13px]">
            {docs.map((d) => (
              <li key={d.name}>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-blue hover:underline">
                    {d.name}
                  </a>
                ) : (
                  <span className="text-ink">{d.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Prior evidence trail */}
      {advisor.verificationRecords.length > 0 && (
        <section className="mb-4 rounded-md border border-gray-300 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold text-ink">Evidence trail</h2>
          <ul className="space-y-2 text-[13px]">
            {advisor.verificationRecords.map((r) => (
              <li key={r.id} className="border-b border-gray-150 pb-2 last:border-0">
                <span className="font-mono text-2xs uppercase text-gray-500">{r.type}</span>
                <span className="ml-2 text-gray-400">{r.createdAt.toISOString().slice(0, 10)}</span>
                <p className="text-ink">{r.notes}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Decision */}
      <form action={reviewAdvisor} className="rounded-md border border-gray-300 bg-white p-4">
        <input type="hidden" name="advisorId" value={advisor.id} />
        <h2 className="mb-2 text-sm font-bold text-ink">Decision</h2>
        <label className="mb-1 block text-2xs font-semibold uppercase text-gray-500">Evidence type</label>
        <select name="type" className="mb-3 w-full max-w-xs rounded-sm border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-ink">
          <option value="manual_review">Manual review</option>
          <option value="id_check">ID check</option>
          <option value="reference_call">Reference call</option>
          <option value="license_check">Credential / licence check</option>
        </select>
        <label className="mb-1 block text-2xs font-semibold uppercase text-gray-500">Notes (required — evidence trail)</label>
        <textarea name="notes" rows={3} required className="mb-3 w-full rounded-sm border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-ink" />
        <div className="flex gap-2">
          <button name="decision" value="approve" className="rounded-sm bg-green-700 px-4 py-2 text-[13px] font-semibold text-white">Approve</button>
          <button name="decision" value="needs_info" className="rounded-sm bg-amber-700 px-4 py-2 text-[13px] font-semibold text-white">Request more info</button>
          <button name="decision" value="reject" className="rounded-sm bg-red-700 px-4 py-2 text-[13px] font-semibold text-white">Reject</button>
        </div>
      </form>
    </div>
  );
}
