#!/usr/bin/env bash
#
# Push env vars from .env.local into a linked Vercel project, for all three
# environments (production, preview, development).
#
# Prereqs:
#   npm i -g vercel && vercel login && vercel link
#   cp .env.example .env.local   # then fill in the two secrets
#
# Usage:
#   ./scripts/vercel-env-sync.sh            # syncs the keys listed below
#
set -euo pipefail

ENV_FILE="${1:-.env.local}"
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — copy .env.example and fill it in."; exit 1; }
command -v vercel >/dev/null || { echo "Vercel CLI not found: npm i -g vercel"; exit 1; }

KEYS=(
  DATABASE_URL
  DIRECT_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_DEFAULT_CURRENCY
  PLATFORM_COMMISSION_BPS
  INSURANCE_COVERAGE_ACTIVE
  INSURANCE_COVERAGE_STATEMENT
)

# Read a KEY="value" (or KEY=value) line from the env file, stripping quotes.
read_val() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | head -1 || true)"
  [ -n "$line" ] || return 1
  local val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"   # strip surrounding double quotes
  printf '%s' "$val"
}

for key in "${KEYS[@]}"; do
  if ! val="$(read_val "$key")" || [ -z "$val" ]; then
    echo "skip  $key (not set in $ENV_FILE)"; continue
  fi
  case "$val" in
    *"[YOUR-DB-PASSWORD]"*|*"<FROM DASHBOARD"*)
      echo "skip  $key (still a placeholder — fill it in first)"; continue;;
  esac
  for target in production preview development; do
    # remove any existing value first so this is idempotent
    vercel env rm "$key" "$target" -y >/dev/null 2>&1 || true
    printf '%s' "$val" | vercel env add "$key" "$target" >/dev/null
    echo "set   $key -> $target"
  done
done

echo "Done. Trigger a redeploy so the new values take effect: vercel --prod"
