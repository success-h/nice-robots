#!/usr/bin/env bash
# Sourced by other scripts. Expects AZURE_* already set.
# Skips az login if already on AZURE_SUBSCRIPTION_ID (unless FORCE_AZ_LOGIN=1).

azure_ensure_logged_in() {
  local current=""
  current="$(az account show --query id -o tsv 2>/dev/null || true)"
  if [[ "${FORCE_AZ_LOGIN:-}" != "1" && -n "$current" && "$current" == "$AZURE_SUBSCRIPTION_ID" ]]; then
    echo "==> az already logged in to subscription ${AZURE_SUBSCRIPTION_ID} (skip login)"
    return 0
  fi

  echo "==> az login (service principal)"
  az login --service-principal \
    -u "$AZURE_CLIENT_ID" \
    -p "$AZURE_CLIENT_SECRET" \
    --tenant "$AZURE_TENANT_ID" \
    --only-show-errors

  echo "==> az account set"
  az account set --subscription "$AZURE_SUBSCRIPTION_ID" --only-show-errors
}
