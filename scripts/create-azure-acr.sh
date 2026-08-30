#!/usr/bin/env bash
# Create this project's Azure Container Registry (separate from Aisha/aishacr).
# Safe to re-run: skips create if the registry already exists.
#
# Usage:
#   make create-azure-acr
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

# shellcheck source=/dev/null
source "$ROOT/scripts/_azure_common.sh"

ACR_NAME="${ACR_NAME:-nicerobotsfeacr}"
RG="${AZURE_RG:-aisharg}"
LOCATION="${AZURE_LOCATION:-northeurope}"
SKU="${ACR_SKU:-Basic}"

azure_ensure_logged_in

if az acr show --name "$ACR_NAME" --resource-group "$RG" &>/dev/null; then
  echo "==> ACR ${ACR_NAME} already exists in ${RG}"
else
  echo "==> creating ACR ${ACR_NAME} (rg=${RG} location=${LOCATION} sku=${SKU})"
  az acr create \
    --resource-group "$RG" \
    --name "$ACR_NAME" \
    --sku "$SKU" \
    --location "$LOCATION" \
    --admin-enabled true
fi

echo "==> ensuring admin user enabled (needed by deploy-azure.sh)"
az acr update --name "$ACR_NAME" --resource-group "$RG" --admin-enabled true --only-show-errors

LOGIN_SERVER="$(az acr show --name "$ACR_NAME" --resource-group "$RG" --query loginServer -o tsv)"
echo "==> done: ${LOGIN_SERVER}"
echo "==> default image path: ${LOGIN_SERVER}/nicerobotsfe:<tag>"
