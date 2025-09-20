import { BACKEND_URL } from '@/constants';

export const useApi = async (
  url: string,
  options: RequestInit = {},
  access_token?: string
) => {
  const withBaseUrl = `${BACKEND_URL}${url}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${access_token}`,
  };

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    //@ts-expect-error error
    !options?.headers?.['Content-Type']
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
  return response;
};
