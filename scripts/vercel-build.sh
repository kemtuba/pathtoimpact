#!/usr/bin/env bash
# The Vercel build command once Kem sets it to `pnpm run build:vercel`.
# Production deploys migrate first, so the schema never trails the code.
# Previews never migrate: the staging database is migrated deliberately.
# VERCEL_ENV is Vercel's environment variable for this; confirm it on the
# first production build and record the result in docs/verification.md.
set -euo pipefail

if [[ "${VERCEL_ENV:-}" == "production" ]]; then
  echo "Production build: applying migrations."
  pnpm run db:migrate
else
  echo "Build for '${VERCEL_ENV:-local}': skipping migrations."
fi

pnpm exec next build
