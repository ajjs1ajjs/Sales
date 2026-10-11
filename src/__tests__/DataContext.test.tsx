import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
