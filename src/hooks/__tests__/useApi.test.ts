import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useApi } from '../useApi';
import { BACKEND_URL } from '@/constants';

describe('useApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes BACKEND_URL and sets Authorization and Content-Type', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }) as any);
    const res = await useApi('/test', { method: 'POST', body: JSON.stringify({ a: 1 }) }, 'tok');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as any;
    expect(url).toBe(`${BACKEND_URL}/test`);
    expect(options.headers.Authorization).toBe('Bearer tok');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(res).toBeInstanceOf(Response);
  });

  it('merges custom headers and skips Content-Type for FormData', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}') as any);
    const fd = new FormData();
    fd.append('a', '1');
    await useApi('/form', { method: 'POST', headers: { 'X-Test': '1' }, body: fd }, 'tok');
    const [, options] = fetchSpy.mock.calls[0] as any;
    expect(options.headers['X-Test']).toBe('1');
    expect(options.headers['Content-Type']).toBeUndefined();
  });
});


