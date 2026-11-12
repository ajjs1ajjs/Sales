import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../DataContext';

function Probe() {
  const { data, loading } = useData();
  if (loading) return <div>loading</div>;
  return <div data-testid="history">{JSON.stringify(data?.notifiedHistory ?? {})}</div>;
}

function GamePassProbe() {
  const { data, loading } = useData();
  if (loading) return <div>loading</div>;
  return <div data-testid="gamepass">{JSON.stringify(data?.gamepass ?? [])}</div>;
}

function StatusProbe() {
  const { data, loading, error, refreshError, lastFetchedAt } = useData();
  return (
    <div>
      <div data-testid="load-state">{loading ? 'loading' : error ? `error:${error}` : 'loaded'}</div>
      <div data-testid="refresh-error">{refreshError ?? ''}</div>
      <div data-testid="freshness">{JSON.stringify(data?.sourceUpdates ?? null)}</div>
      <div data-testid="last-fetched">{lastFetchedAt ?? ''}</div>
    </div>
  );
}

function PriceHistoryProbe() {
  const { data, loading } = useData();
  return <div data-testid="price-history">{loading ? 'loading' : JSON.stringify(data?.priceHistory)}</div>;
}

describe('price history data', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('normalizes external observations and sorts valid prices by date', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      lastUpdated: '', steam: [], priceHistory: {
        '123': [
          { date: '2026-11-11', price: 4, currency: 'UAH' },
          { date: '2026-11-10', price: 5, currency: 'UAH' },
          { date: 'invalid', price: 1, currency: 'UAH' },
          { date: '2026-11-10', price: -1, currency: 'UAH' },
        ],
        invalid: [{ date: '2026-11-10', price: 1, currency: 'UAH' }],
      },
    }) }));
    render(<DataProvider><PriceHistoryProbe /></DataProvider>);
    await waitFor(() => expect(screen.getByTestId('price-history')).not.toHaveTextContent('loading'));
    const history = JSON.parse(screen.getByTestId('price-history').textContent!);
    expect(history).toEqual({ '123': [
      { date: '2026-11-10', price: 5, currency: 'UAH' },
      { date: '2026-11-11', price: 4, currency: 'UAH' },
    ] });
  });
});

describe('M2 regression: notifiedHistory is normalized like steam', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('coerces bad percent/timestamp/type instead of passing through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lastUpdated: '',
        steam: [],
        notifiedHistory: {
          good: { title: 'G', price: 5, percent: 50, timestamp: '2026-01-01T00:00:00.000Z', type: 'discount' },
          badPercent: { title: 'B', price: 1, percent: 'NaN', timestamp: '2026-01-01T00:00:00.000Z', type: 'discount' },
          badDate: { title: 'D', price: 1, percent: 10, timestamp: 'not-a-date', type: 'free' },
          badType: { title: 'T', price: 1, percent: 10, timestamp: '2026-01-01T00:00:00.000Z', type: 'evil' },
          noTitle: { price: 1, percent: 10, timestamp: '2026-01-01T00:00:00.000Z', type: 'free' },
        },
      }),
    }));
    render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );
    const el = await screen.findByTestId('history');
    await waitFor(() => expect(el.textContent).toContain('good'));
    const hist = JSON.parse(el.textContent ?? '{}');
    expect(hist.good.percent).toBe(50);
    expect(hist.badPercent.percent).toBe(0);
    expect(hist.badDate.timestamp).toBe('');
    expect(hist.badType.type).toBe('discount');
    expect(hist.noTitle).toBeUndefined();
  });
});

describe('Game Pass catalog is normalized like steam', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes fields, fixes protocol-relative images and drops entries without title', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lastUpdated: '',
        steam: [],
        gamepass: [
          {
            id: '9PB301R051CQ',
            title: 'Good Game',
            imageUrl: '//store-images.s-microsoft.com/image/test.jpg',
            url: 'https://www.xbox.com/uk-UA/games/store/good-game/9PB301R051CQ',
            isNew: true,
            isPopular: false,
          },
          { id: 'broken', title: 42 },
          { id: 'no-title', url: 'https://example.com' },
        ],
        notifiedHistory: {
          gp: { title: 'Good Game', price: 0, percent: 0, timestamp: '2026-01-01T00:00:00.000Z', type: 'gamepass' },
        },
      }),
    }));
    render(
      <DataProvider>
        <GamePassProbe />
      </DataProvider>,
    );
    const el = await screen.findByTestId('gamepass');
    await waitFor(() => expect(el.textContent).toContain('Good Game'));
    const list = JSON.parse(el.textContent ?? '[]');
    expect(list).toHaveLength(1);
    expect(list[0].imageUrl).toBe('https://store-images.s-microsoft.com/image/test.jpg');
    expect(list[0].isNew).toBe(true);
    expect(list[0].isPopular).toBe(false);
  });

  it('defaults gamepass to an empty array when the field is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lastUpdated: '', steam: [] }),
    }));
    render(
      <DataProvider>
        <GamePassProbe />
      </DataProvider>,
    );
    const el = await screen.findByTestId('gamepass');
    expect(el.textContent).toBe('[]');
  });
});

describe('catalog freshness and refresh failures', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes sourceUpdates and drops invalid timestamps', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lastUpdated: '2026-11-04T09:00:00.000Z',
        sourceUpdates: { steam: '2026-11-04T09:00:00.000Z', gamepass: 'not-a-date' },
        steam: [],
      }),
    }));
    render(
      <DataProvider>
        <StatusProbe />
      </DataProvider>,
    );
    await screen.findByText('loaded');
    expect(JSON.parse(screen.getByTestId('freshness').textContent ?? '{}')).toEqual({
      steam: '2026-11-04T09:00:00.000Z',
    });
  });

  it('keeps loaded data and reports a failed background refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ lastUpdated: '2026-11-04T09:00:00.000Z', steam: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        body: { cancel: async () => undefined },
      });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <DataProvider>
        <StatusProbe />
      </DataProvider>,
    );
    await screen.findByText('loaded');
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.getByTestId('refresh-error').textContent).toContain('404'));
    expect(screen.getByTestId('load-state').textContent).toBe('loaded');
    expect(screen.getByTestId('last-fetched').textContent).not.toBe('');
  });

  it('times out a stalled request instead of staying on the loading screen', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }));
      vi.stubGlobal('fetch', fetchMock);
      render(
        <DataProvider>
          <StatusProbe />
        </DataProvider>,
      );
      expect(screen.getByTestId('load-state').textContent).toBe('loading');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(26_000);
      });
      expect(screen.getByTestId('load-state').textContent).toContain('error:');
      expect(screen.getByTestId('load-state').textContent).toContain('Перевищено час');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('bounds body parsing as well as response headers', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: undefined,
          json: () => new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
        }));
      vi.stubGlobal('fetch', fetchMock);
      render(
        <DataProvider>
          <StatusProbe />
        </DataProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(26_000);
      });
      expect(screen.getByTestId('load-state').textContent).toContain('Перевищено час');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
