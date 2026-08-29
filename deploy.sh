#!/usr/bin/env bash
set -euo pipefail

# ===== Config (override via env vars if needed) =====
PROJECT_ID="${PROJECT_ID:-nicecoachapi}"
REGION="${REGION:-us-east1}"
SERVICE_NAME="${SERVICE_NAME:-nicebuddyci}"

# Artifact Registry
AR_REPO="${AR_REPO:-nice-buddies-ai-react-repo}"
IMAGE_NAME="${IMAGE_NAME:-nicebuddiesfe}"

# Build config
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
PLATFORM="${PLATFORM:-linux/amd64}"

# Deploy access
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-true}"
ALLOW_EXISTING_SERVICE_UPDATE="${ALLOW_EXISTING_SERVICE_UPDATE:-true}"

# Build args for Next.js public env (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-33260128368-l790qgp67ndlse4c0ost4r8j19g5cae2.apps.googleusercontent.com}"
NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL:-https://nicecoachapi-990714713850.us-east1.run.app/api}"
NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL:-wss://nicecoachapi-990714713850.us-east1.run.app/socket}"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_test_51SJxJnRcwh68nPPaj9lNSEvmvirFW7ocWl5aeljrBpsUNMMrXPO9JgNZbSZW1nyFViVHgxCWlqkMNYwyaSASYg7600bHNA92K4}"

# Tag = timestamp only (date + time)
TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${TAG}"
REVISION_SUFFIX="${TAG}"

echo "==> Project:    ${PROJECT_ID}"
echo "==> Region:     ${REGION}"
echo "==> Service:    ${SERVICE_NAME}"
echo "==> Dockerfile: ${DOCKERFILE}"
echo "==> Image:      ${IMAGE_URI}"

# Use target GCP project
gcloud config set project "${PROJECT_ID}" >/dev/null

# Safety check: do not update existing Cloud Run service unless explicitly allowed.
if gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --platform=managed >/dev/null 2>&1; then
  if [[ "${ALLOW_EXISTING_SERVICE_UPDATE}" != "true" ]]; then
    echo "ERROR: Cloud Run service '${SERVICE_NAME}' already exists in ${PROJECT_ID}/${REGION}."
    echo "If you want to update it, rerun with: ALLOW_EXISTING_SERVICE_UPDATE=true ./deploy.sh"
    exit 1
  fi
fi

# Docker auth for Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# Build args
BUILD_ARGS=()
if [[ -n "${NEXT_PUBLIC_GOOGLE_CLIENT_ID}" ]]; then
  BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}")
fi
if [[ -n "${NEXT_PUBLIC_BACKEND_URL}" ]]; then
  BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}")
fi
if [[ -n "${NEXT_PUBLIC_WS_URL}" ]]; then
  BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}")
fi
if [[ -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" ]]; then
  BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}")
fi

# Build & push
docker build --platform "${PLATFORM}" -f "${DOCKERFILE}" -t "${IMAGE_URI}" "${BUILD_ARGS[@]}" .
docker push "${IMAGE_URI}"

DEPLOY_ARGS=(
  "--image=${IMAGE_URI}"
  "--region=${REGION}"
  "--platform=managed"
  "--revision-suffix=${REVISION_SUFFIX}"
  "--port=3000"
)

# Runtime env vars (for window.__ENV injection in layout.tsx)
RUNTIME_ENV_PAIRS=()
if [[ -n "${NEXT_PUBLIC_GOOGLE_CLIENT_ID}" ]]; then
  RUNTIME_ENV_PAIRS+=("NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}")
fi
if [[ -n "${NEXT_PUBLIC_BACKEND_URL}" ]]; then
  RUNTIME_ENV_PAIRS+=("NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}")
fi
if [[ -n "${NEXT_PUBLIC_WS_URL}" ]]; then
  RUNTIME_ENV_PAIRS+=("NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}")
fi
if [[ -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" ]]; then
  RUNTIME_ENV_PAIRS+=("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}")
fi

if [[ ${#RUNTIME_ENV_PAIRS[@]} -gt 0 ]]; then
  DEPLOY_ARGS+=("--update-env-vars=$(IFS=,; echo "${RUNTIME_ENV_PAIRS[*]}")")
fi

# Deploy
if [[ "${ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  gcloud run deploy "${SERVICE_NAME}" "${DEPLOY_ARGS[@]}" --allow-unauthenticated
else
  gcloud run deploy "${SERVICE_NAME}" "${DEPLOY_ARGS[@]}" --no-allow-unauthenticated
fi

echo "==> Deploy completed"
echo "==> Revision image: ${IMAGE_URI}"
