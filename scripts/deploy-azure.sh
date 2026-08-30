#!/usr/bin/env bash
# Deploy nice-robots (Next.js) to Azure Container Apps (parallel to GCP deploy.sh).
# Requires: az, docker, git. Non-interactive: service principal in .env.deploy
#
# Usage (from repo root):
#   make deploy-azure
#   TAG=v1.2.3 make deploy-azure
#   NO_CACHE=1 make deploy-azure
#
# Default tag: <local timestamp>-<short git sha>
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

TAG="${TAG:-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"

# Own ACR — do NOT reuse Aisha/wisebuddy registry (aishacr).
ACR_NAME="${ACR_NAME:-nicerobotsfeacr}"
RG="${AZURE_RG:-aisharg}"
LOCATION="${AZURE_LOCATION:-northeurope}"
APP_NAME="${CONTAINER_APP_NAME:-nicerobotsfe}"
APP_ENV="${CONTAINER_APP_ENV:-aishaenv}"
IMAGE_REPO="${IMAGE_REPO:-nicerobotsfe}"
TARGET_PORT="${TARGET_PORT:-3000}"

# Public Next.js build-time / runtime env (override in .env.deploy)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-}"
NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL:-}"
NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL:-}"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"

LOCAL_IMAGE="${IMAGE_REPO}:${TAG}"
REMOTE_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_REPO}:${TAG}"

echo "==> Azure deploy (FE): tag=${TAG} image=${REMOTE_IMAGE}"

azure_ensure_logged_in

echo "==> az acr login (${ACR_NAME})"
az acr login --name "$ACR_NAME" --only-show-errors

DOCKER_BUILD_ARGS=(-f "$DOCKERFILE" -t "$LOCAL_IMAGE")
if [[ "${NO_CACHE:-}" == "1" ]]; then
  DOCKER_BUILD_ARGS=(--no-cache "${DOCKER_BUILD_ARGS[@]}")
fi
if [[ -n "${NEXT_PUBLIC_GOOGLE_CLIENT_ID}" ]]; then
  DOCKER_BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}")
fi
if [[ -n "${NEXT_PUBLIC_BACKEND_URL}" ]]; then
  DOCKER_BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}")
fi
if [[ -n "${NEXT_PUBLIC_WS_URL}" ]]; then
  DOCKER_BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}")
fi
if [[ -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" ]]; then
  DOCKER_BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}")
fi
DOCKER_BUILD_ARGS+=(.)

echo "==> docker build"
docker build "${DOCKER_BUILD_ARGS[@]}"

echo "==> docker tag / push"
docker tag "$LOCAL_IMAGE" "$REMOTE_IMAGE"
docker push "$REMOTE_IMAGE"

if [[ -n "${ACR_REGISTRY_PASSWORD:-}" ]]; then
  REGISTRY_PASSWORD="$ACR_REGISTRY_PASSWORD"
else
  echo "==> fetching ACR admin password (az acr credential show)"
  REGISTRY_PASSWORD="$(az acr credential show --name "$ACR_NAME" --query 'passwords[0].value' -o tsv)"
fi

if [[ -z "$REGISTRY_PASSWORD" ]]; then
  echo "error: empty registry password. Enable ACR admin user in Portal, or set ACR_REGISTRY_PASSWORD in .env.deploy" >&2
  exit 1
fi

echo "==> az containerapp up"
az containerapp up \
  --name "$APP_NAME" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --environment "$APP_ENV" \
  --image "$REMOTE_IMAGE" \
  --registry-server "${ACR_NAME}.azurecr.io" \
  --registry-username "$ACR_NAME" \
  --registry-password "$REGISTRY_PASSWORD" \
  --target-port "$TARGET_PORT" \
  --ingress external

echo "==> done: ${REMOTE_IMAGE}"
echo "==> Tip: set NEXT_PUBLIC_* in .env.deploy so the image is built against the Azure API URL"
