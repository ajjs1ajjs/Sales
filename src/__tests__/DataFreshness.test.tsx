import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '../contexts/LocaleContext';
import { DataFreshness } from '../components/DataFreshness';
import { findStaleSources, SOURCE_STALE_AFTER_MS } from '../freshness';

const now = Date.parse('2026-11-04T12:00:00.000Z');

function renderFreshness(props: Parameters<typeof DataFreshness>[0]) {
  return render(
    <LocaleProvider initialLocale="uk">
      <DataFreshness {...props} />
    </LocaleProvider>,
  );
}

describe('catalog freshness warnings', () => {
  it('flags only sources older than the stale threshold', () => {
    const stale = new Date(now - SOURCE_STALE_AFTER_MS - 1000).toISOString();
    const fresh = new Date(now - 1000).toISOString();

    expect(findStaleSources({ steam: stale, gamepass: fresh }, now).map((source) => source.key)).toEqual(['steam']);
    expect(findStaleSources({ steam: fresh, gamepass: stale }, now).map((source) => source.key)).toEqual(['gamepass']);
    expect(findStaleSources({ steam: fresh, gamepass: fresh }, now)).toEqual([]);
    expect(findStaleSources(undefined, now)).toEqual([]);
  });

  it('shows a stale warning for each outdated source', () => {
    const stale = new Date(Date.now() - SOURCE_STALE_AFTER_MS - 1000).toISOString();
    renderFreshness({ sourceUpdates: { steam: stale, gamepass: stale }, refreshError: null, lastFetchedAt: null });

    const messages = screen.getAllByRole('status').map((node) => node.textContent);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('Steam');
    expect(messages[1]).toContain('Game Pass');
    expect(messages[0]).toContain('застаріли');
  });

  it('shows the last successful fetch time when refreshing fails', () => {
    renderFreshness({
      sourceUpdates: undefined,
      refreshError: 'HTTP 500',
      lastFetchedAt: Date.parse('2026-11-04T09:30:00.000Z'),
    });

    const message = screen.getByRole('status');
    expect(message.textContent).toContain('Не вдалося оновити дані');
    // 09:30 UTC is 11:30 in Europe/Kyiv (EET in November).
    expect(message.textContent).toContain('11:30');
  });

  it('renders nothing when data is fresh and the last refresh succeeded', () => {
    renderFreshness({
      sourceUpdates: { steam: new Date(Date.now() - 1000).toISOString() },
      refreshError: null,
      lastFetchedAt: Date.now(),
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
