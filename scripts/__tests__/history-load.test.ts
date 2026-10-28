import { describe, expect, it, vi } from 'vitest';
import { loadNotifiedHistory, type HistorySource } from '../fetch-deals';

const log = { info: vi.fn(), error: vi.fn() };

function source(
  local: string | undefined,
  remote: () => Promise<unknown | undefined>,
): HistorySource {
  return { readLocal: () => local, readRemote: remote };
}

const validEntry = (title: string) => ({
  title,
  price: 0,
  percent: 0,
  timestamp: '2026-10-01T00:00:00.000Z',
  type: 'free',
});

describe('loadNotifiedHistory (AUD-17)', () => {
  it('reads a valid local history', async () => {
    const history = await loadNotifiedHistory(
      source(JSON.stringify({ steam_free_1: validEntry('A') }), async () => undefined),
      log,
    );
    expect(Object.keys(history)).toEqual(['steam_free_1']);
  });

  it('recovers from the remote copy when the local file is corrupt', async () => {
    const history = await loadNotifiedHistory(
      source('{not-json', async () => ({ steam_free_2: validEntry('B') })),
      log,
    );
    expect(Object.keys(history)).toEqual(['steam_free_2']);
  });

  it('refuses to run when the local file is corrupt and remote is unavailable', async () => {
    await expect(
      loadNotifiedHistory(source('{not-json', async () => undefined), log),
    ).rejects.toThrow(/refusing to run/);
  });

  it('refuses to run when the local file is corrupt and the remote request throws', async () => {
    await expect(
      loadNotifiedHistory(
        source('{not-json', async () => {
          throw new Error('offline');
        }),
        log,
      ),
    ).rejects.toThrow(/refusing to run/);
  });

  it('starts fresh when there is no local file and remote is unavailable (first run)', async () => {
    const history = await loadNotifiedHistory(
      source(undefined, async () => {
        throw new Error('offline');
      }),
      log,
    );
    expect(history).toEqual({});
  });

  it('drops malformed entries and legacy epic keys', async () => {
    const history = await loadNotifiedHistory(
      source(
        JSON.stringify({
          ok: validEntry('T'),
          bad: { title: 5 },
          epic_x: validEntry('E'),
        }),
        async () => undefined,
      ),
      log,
    );
    expect(Object.keys(history)).toEqual(['ok']);
  });
});
