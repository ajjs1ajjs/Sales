import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../DataContext';

function Probe() {
  const { data, loading } = useData();
  if (loading) return <div>loading</div>;
  return <div data-testid="history">{JSON.stringify(data?.notifiedHistory ?? {})}</div>;
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
