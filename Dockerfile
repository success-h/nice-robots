# syntax=docker/dockerfile:1.6

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 1) Install full deps for build
FROM base AS deps
COPY package*.json ./
RUN npm install --no-audit --no-fund

# 2) Build the Next.js app
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Inject public Google OAuth client id at build time (no code edits needed)
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=33260128368-l790qgp67ndlse4c0ost4r8j19g5cae2.apps.googleusercontent.com
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SJxJnRcwh68nPPaj9lNSEvmvirFW7ocWl5aeljrBpsUNMMrXPO9JgNZbSZW1nyFViVHgxCWlqkMNYwyaSASYg7600bHNA92K4
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
# Inject public backend URLs for client bundle (defaults can be overridden via --build-arg)
ARG NEXT_PUBLIC_BACKEND_URL=https://nicecoachapi-990714713850.us-east1.run.app/api
ARG NEXT_PUBLIC_WS_URL=wss://nicecoachapi-990714713850.us-east1.run.app/socket
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure platform binary for lightningcss is present
RUN npm i --no-audit --no-fund lightningcss-linux-x64-gnu@$(node -p "require('./node_modules/lightningcss/package.json').version") || npm i --no-audit --no-fund lightningcss-linux-x64-gnu
RUN npm i --no-audit --no-fund @tailwindcss/oxide-linux-x64-gnu@$(node -p "require('./node_modules/@tailwindcss/oxide/package.json').version") || npm i --no-audit --no-fund @tailwindcss/oxide-linux-x64-gnu
RUN npm rebuild lightningcss --force || true
RUN npm run build

# 3) Install only production deps
FROM base AS prod-deps
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# 4) Runtime image
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# Copy production node_modules and build artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD sh -c 'npm run start -- -p "${PORT:-3000}"'


