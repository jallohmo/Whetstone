"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Upload } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { submitAdvisorApplication } from "@/lib/actions/advisor";
import { cn } from "@/lib/cn";

interface TaxonomyGroup {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

/**
 * Screen 10 / AdvisorOnboardingWizard (A1, B1, B2). Collects profile + specialties
 * and uploads credential/ID documents. Documents go straight from the browser to
 * the private `advisor-credentials` bucket under `<userId>/…` (the RLS convention),
 * so they never pass through the app server. Profile fields submit via the
 * server action, which leaves the profile PENDING for ops review.
 *
 * Explicit, forgiving, large targets — the audience spans digital-fluency levels.
 */
export function AdvisorOnboardingForm({
  userId,
  industries,
}: {
  userId: string;
  industries: TaxonomyGroup[];
}) {
  const [uploads, setUploads] = useState<{ name: string; state: "up" | "done" | "err" }[]>([]);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const supabase = createClient();
    for (const file of files) {
      setUploads((u) => [...u, { name: file.name, state: "up" }]);
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("advisor-credentials")
        .upload(path, file, { upsert: false });
      setUploads((u) =>
        u.map((x) =>
          x.name === file.name && x.state === "up"
            ? { ...x, state: error ? "err" : "done" }
            : x,
        ),
      );
    }
    e.target.value = "";
  }

  return (
    <form action={submitAdvisorApplication} className="flex flex-col gap-6">
      {/* Step: background */}
      <section>
        <h3 className="mb-2 text-h3 text-ink">Your background</h3>
        <Field label="One-line summary" hint="What customers see first. e.g. 'Retired CFO — 25 years on cash flow and lending.'">
          <Input name="headline" placeholder="A short, plain-language summary" maxLength={160} />
        </Field>
        <Field label="About you" hint="Where you've worked, what you're genuinely good at helping with.">
          <Textarea name="bio" rows={5} required placeholder="Tell us about your experience…" />
        </Field>
        <Field label="Years of experience">
          <Input name="yearsExperience" type="number" min={0} max={70} required className="max-w-[140px]" />
        </Field>
      </section>

      {/* Step: specialties */}
      <section>
        <h3 className="mb-1 text-h3 text-ink">What can you advise on?</h3>
        <p className="mb-3 text-sm text-gray-500">Pick every area you could genuinely help a business with.</p>
        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 p-4">
          {industries.map((ind) => (
            <fieldset key={ind.id} className="mb-4 last:mb-0">
              <legend className="mb-1.5 text-sm font-semibold text-ink">{ind.name}</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {ind.children.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-body text-gray-700">
                    <input type="checkbox" name="specialtyIds" value={c.id} className="h-4 w-4" />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      {/* Step: credentials */}
      <section>
        <h3 className="mb-1 text-h3 text-ink">Credentials & ID</h3>
        <p className="mb-3 text-sm text-gray-500">
          Upload anything that backs up your experience (certificates, licences) and a photo ID.
          These are private — only our verification team sees them.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-body font-semibold text-ink hover:border-gray-300">
          <Upload size={18} />
          Choose files
          <input type="file" multiple className="hidden" onChange={onFiles} accept="image/*,application/pdf" />
        </label>
        {uploads.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {uploads.map((u, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                {u.state === "up" && <Loader2 size={14} className="animate-spin text-gray-400" />}
                {u.state === "done" && <Check size={14} className="text-green-500" />}
                {u.state === "err" && <span className="text-red-500">✕</span>}
                <span className={cn(u.state === "err" && "text-red-700")}>{u.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <SubmitButton />
        <p className="mt-3 text-sm text-gray-500">
          You can submit now and add more later. We&apos;ll review and get back to you.
        </p>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Submit application"}
    </Button>
  );
}
