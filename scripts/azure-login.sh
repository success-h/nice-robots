#!/usr/bin/env bash
# One-time (or rare) Azure login for NiceRobots deploy scripts.
# After this, `make deploy-azure` / `make create-azure-acr` skip re-login
# while your az session is still valid for the same subscription.
#
# Usage:
#   make azure-login
#   # or: ./scripts/azure-login.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/.env.deploy}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
else
  echo "error: missing $ENV_FILE (copy from .env.deploy.example and fill values)" >&2
  exit 1
fi

: "${AZURE_TENANT_ID:?set AZURE_TENANT_ID in .env.deploy}"
: "${AZURE_CLIENT_ID:?set AZURE_CLIENT_ID in .env.deploy}"
: "${AZURE_CLIENT_SECRET:?set AZURE_CLIENT_SECRET in .env.deploy}"
: "${AZURE_SUBSCRIPTION_ID:?set AZURE_SUBSCRIPTION_ID in .env.deploy}"

echo "==> az login (service principal) — once is enough until the token expires"
az login --service-principal \
  -u "$AZURE_CLIENT_ID" \
  -p "$AZURE_CLIENT_SECRET" \
  --tenant "$AZURE_TENANT_ID" \
  --only-show-errors

echo "==> az account set"
az account set --subscription "$AZURE_SUBSCRIPTION_ID" --only-show-errors

echo "==> current account:"
az account show --query "{name:name, id:id, user:user.name}" -o table

echo "==> done. You can run make create-azure-acr / make deploy-azure without logging in again."
echo "    If az starts failing with auth errors later, run: make azure-login"
