// src/constants/index.ts

export const API_KEY =
  '$2b$12$bN7.GUvsiKgGapuVJHOVl.FVdoH7iJOTjdhI3ODO7Z95l2NjfkXqq';

const GID =
  (typeof window !== 'undefined' &&
    (window as any).__ENV?.NEXT_PUBLIC_GOOGLE_CLIENT_ID) ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
if (!GID) {
  throw new Error('Missing required env: NEXT_PUBLIC_GOOGLE_CLIENT_ID');
}
export const GOOGLE_WEB_CLIENT_ID = GID;

// IMPORTANT: Next.js replaces public env only for direct property access
// like process.env.NEXT_PUBLIC_BACKEND_URL. Do NOT access by string key.
const BACKEND =
  (typeof window !== 'undefined' &&
    (window as any).__ENV?.NEXT_PUBLIC_BACKEND_URL) ||
  process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND) {
  throw new Error('Missing required env: NEXT_PUBLIC_BACKEND_URL');
}
export const BACKEND_URL = BACKEND;

const WS =
  (typeof window !== 'undefined' &&
    (window as any).__ENV?.NEXT_PUBLIC_WS_URL) ||
  process.env.NEXT_PUBLIC_WS_URL;
if (!WS) {
  throw new Error('Missing required env: NEXT_PUBLIC_WS_URL');
}
export const WS_URL = WS;
// export const BACKEND_URL = 'https://teen-robots-api-prod.agreeablehill-b67ffd87.centralus.azurecontainerapps.io/api';
// export const WS_URL = "wss://teen-robots-api-prod.agreeablehill-b67ffd87.centralus.azurecontainerapps.io/socket";
