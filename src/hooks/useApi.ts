import { BACKEND_URL } from '@/constants';
import useUserStore from '@/zustand/useStore';

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
  try {
    // Inspect JSON body (via clone) to detect specific business errors and redirect accordingly
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const cloned = response.clone();
      const data = await cloned.json().catch(() => undefined);
      const errorKey = data?.error as string | undefined;
      const message = data?.message as string | undefined;

      if (typeof window !== 'undefined' && errorKey) {
        const path = window.location?.pathname || '/';
        let from = 'home';
        if (path.startsWith('/chat')) from = 'chat';
        else if (path.startsWith('/profile')) from = 'settings';

        const insufficientCredits = errorKey === 'insufficient_credits' || errorKey === 'insufficient_credit';
        const insufficientPlan = errorKey === 'insufficient_plan';

        if (insufficientCredits || insufficientPlan) {
          useUserStore.getState().openInsufficientModal({
            type: insufficientCredits ? 'credits' : 'plan',
            message: message || null,
            from,
          });
        }
      }
    }
  } catch {
    // Swallow inspection errors; callers still receive the original response
  }

  return response;
};
