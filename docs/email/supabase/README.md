# Supabase auth email templates (Whetstone-branded)

These are **reference copies** of the auth-email HTML to paste into the Supabase
dashboard — they are **not** used by the app at runtime (Supabase Auth composes
and sends these; see `docs/LAUNCH_CHECKLIST.md` §5b). They share the shell and
colours of the app-event emails in `src/lib/email/templates.ts` so every message
reads as Whetstone.

## How to apply

Supabase dashboard → **Authentication → Emails** → pick a template → paste the
matching file's HTML into the **Message body**, and set the **Subject** below.
Redeploy is not needed — Supabase uses the new template immediately.

| Supabase template | File | Suggested subject | Key variable |
|---|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your Whetstone email | `{{ .ConfirmationURL }}` |
| Reset password | `reset-password.html` | Reset your Whetstone password | `{{ .ConfirmationURL }}` |
| Magic Link | `magic-link.html` | Your Whetstone sign-in link | `{{ .ConfirmationURL }}` |
| Change Email Address | `change-email.html` | Confirm your new Whetstone email | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}` |
| Reauthentication | `reauthentication.html` | Your Whetstone verification code | `{{ .Token }}` |

The two the app actually triggers today are **Confirm signup** and **Reset
password**. The others are included so every slot is on-brand if enabled.

## Notes

- **Don't change the `{{ ... }}` variables** — Supabase substitutes them at send
  time. Editing the surrounding copy/markup is fine.
- These use `{{ .ConfirmationURL }}` (the click-to-confirm link), which matches
  the app's link-based flows. If you switch a flow to OTP codes instead, swap in
  `{{ .Token }}` like `reauthentication.html` does.
- The links only resolve if Supabase's **Site URL + Redirect URLs** include the
  production domain (LAUNCH_CHECKLIST §3).
- Keep this folder in sync with `src/lib/email/templates.ts` if the brand shell
  changes, so auth and app emails stay visually identical.
