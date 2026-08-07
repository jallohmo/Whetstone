import { PageHeader, Card, ScaffoldNote } from "@/components/ui";
import { CheckCircle2, Circle } from "lucide-react";

// Screen 10 — Advisor application/onboarding (A1, B1, B2).
// Step-by-step wizard, NOT one long form. Explicit "Next" steps, large targets,
// forgiving of hesitant interaction — the audience spans digital fluency levels.
const steps = [
  { title: "Identity", body: "Confirm who you are (ID check via our verification partner)." },
  { title: "Background & credentials", body: "Your experience and any documents that back it up." },
  { title: "Industry & specialties", body: "Tag the industries and specialties you can genuinely advise on." },
  { title: "Availability", body: "Set the times you're open to sessions." },
];

export default function AdvisorApplyPage() {
  return (
    <div>
      <PageHeader
        title="Become a Whetstone advisor"
        subtitle="Four short steps. Worth doing properly — verification is what makes your profile trusted."
      />
      <ol className="flex flex-col gap-list-rhythm">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Card className="flex items-start gap-4">
              {i === 0 ? (
                <Circle className="mt-0.5 shrink-0 text-ink" size={22} />
              ) : (
                <CheckCircle2 className="mt-0.5 shrink-0 text-gray-300" size={22} />
              )}
              <div>
                <h3 className="text-h3 text-ink">
                  Step {i + 1}: {s.title}
                </h3>
                <p className="mt-1 text-body text-gray-600">{s.body}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <ScaffoldNote>
          AdvisorOnboardingWizard. Credential/ID documents upload to the private{" "}
          <code className="font-mono">advisor-credentials</code> Supabase Storage bucket. Creates a
          User (role ADVISOR) + AdvisorProfile in a &quot;signed up but not verified&quot; state.
        </ScaffoldNote>
      </div>
    </div>
  );
}
