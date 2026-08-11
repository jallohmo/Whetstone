"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, FileText, Image as ImageIcon, Loader2, UploadCloud } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { PillToggle } from "@/components/ui/selection";
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

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
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
  }

  return (
    <form action={submitAdvisorApplication} className="flex flex-col gap-4">
      {/* Step: background */}
      <Card>
        <h3 className="mb-4 text-h3 text-ink">Your background</h3>
        <Field label="One-line summary" hint="What clients see first. e.g. 'Retired CFO — 25 years on cash flow and lending.'">
          <Input name="headline" placeholder="A short, plain-language summary" maxLength={160} />
        </Field>
        <Field label="About you" hint="Where you've worked, what you're genuinely good at helping with.">
          <Textarea name="bio" rows={5} required placeholder="Tell us about your experience…" />
        </Field>
        <Field label="Years of experience">
          <Input name="yearsExperience" type="number" min={0} max={70} required className="max-w-[140px]" />
        </Field>
      </Card>

      {/* Step: specialties */}
      <Card>
        <h3 className="text-h3 text-ink">What can you advise on?</h3>
        <p className="mt-1 text-sm text-gray-500">
          Pick every area you could genuinely help a business with.
        </p>
        <div className="mt-4 flex flex-col gap-5">
          {industries.map((ind) => (
            <fieldset key={ind.id}>
              <legend className="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-gray-500">
                {ind.name}
              </legend>
              <div className="flex flex-wrap gap-2">
                {ind.children.map((c) => (
                  <PillToggle key={c.id} name="specialtyIds" value={c.id}>
                    {c.name}
                  </PillToggle>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-5 border-t border-dashed border-gray-300 pt-4">
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Something not listed?
          </label>
          <Textarea
            name="otherSpecialties"
            rows={2}
            placeholder="Add any industry or capability we're missing — our team will review it."
          />
          <p className="mt-1.5 text-sm text-gray-500">
            Optional. Use this if none of the areas above quite fit.
          </p>
        </div>
      </Card>

      {/* Step: credentials */}
      <Card>
        <h3 className="text-h3 text-ink">Credentials &amp; ID</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload anything that backs up your experience (certificates, licences) and a
          photo ID. These are private — only our verification team sees them.
        </p>

        <label
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition duration-DEFAULT ease-soft hover:border-brand-blue/50 hover:bg-brand-blue-100/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-blue-100 text-brand-blue">
            <UploadCloud size={22} strokeWidth={2} />
          </span>
          <span className="text-body font-semibold text-ink">
            Drop files or <span className="text-brand-blue">choose files</span>
          </span>
          <span className="text-sm text-gray-500">PDF, JPG or PNG</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
            accept="image/*,application/pdf"
          />
        </label>

        {uploads.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {uploads.map((u, i) => {
              const isImage = /\.(png|jpe?g|gif|webp)$/i.test(u.name);
              const FileIcon = isImage ? ImageIcon : FileText;
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <FileIcon size={18} className="shrink-0 text-gray-400" strokeWidth={2} />
                  <span className={cn("flex-1 truncate text-gray-700", u.state === "err" && "text-red-700")}>
                    {u.name}
                  </span>
                  {u.state === "up" && <Loader2 size={16} className="animate-spin text-gray-400" />}
                  {u.state === "done" && <Check size={16} className="text-green-500" strokeWidth={2.5} />}
                  {u.state === "err" && <span className="text-xs font-semibold text-red-700">Failed</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton />
        <p className="text-sm text-gray-500">
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
      {!pending && <ArrowRight size={16} strokeWidth={2} />}
    </Button>
  );
}
