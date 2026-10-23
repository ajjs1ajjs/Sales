import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithRetry } from '../fetch-deals';

afterEach(() => vi.unstubAllGlobals());

describe('fetch request timeout', () => {
  it('keeps the timeout active while a successful response body is downloading', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string | URL | Request, options?: RequestInit) => Promise.resolve(
      new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          options?.signal?.addEventListener('abort', () => controller.error(new Error('aborted')));
        },
      })),
    )));
    await expect(fetchWithRetry('https://example.test/data', undefined, 1, 0, 10)).rejects.toThrow(/after 1 attempts/);
  });
});
