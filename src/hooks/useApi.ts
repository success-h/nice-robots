// src/hooks/useApi.ts

import { BACKEND_URL } from '@/constants';

export const useApi = async (
  url: string,
  options: RequestInit = {},
  access_token?: string
) => {
  const withBaseUrl = `${BACKEND_URL}${url}`;
  console.log({ withBaseUrl });

  // Build headers conditionally
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access_token}`,
  };

  // Only add Content-Type for JSON requests, not FormData
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !options.headers?.['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const withBaseOptions = {
    ...options,
    headers,
  };

  const response = await fetch(withBaseUrl, withBaseOptions);
  console.log({ response });
  return response;
};
