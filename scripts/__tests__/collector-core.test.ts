import { describe, expect, it } from 'vitest';
import {
  chooseSteamSnapshot,
  isValidSteamSearchPage,
  planGamePassNewEntries,
  planGamePassPopularEntries,
  resolveCatalogTimestamps,
  selectSteamNotifications,
  updatePriceHistory,
} from '../collector-core';
import type { GamePassGame, SteamGame } from '../../src/types';
import { parseSearchHtml, processCategoryItems } from '../fetch-deals';

const steamGame = (id: string): SteamGame => ({
  id, title: `Game ${id}`, imageUrl: '', originalPrice: 10, discountPrice: 5,
  discountPercent: 50, currency: 'USD', url: `https://store.steampowered.com/app/${id}`,
  isSpecial: true, isFree: false, isPopular: false,
});

const gamePassGame = (id: string, flags: Partial<GamePassGame> = {}): GamePassGame => ({
  id, title: `Game ${id}`, url: `https://www.xbox.com/games/store/${id}`,
  imageUrl: '', isNew: true, isPopular: false, ...flags,
});

describe('collector regression fixes', () => {
  it('records only fresh Steam prices once per day and retains recent history on failure', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const previous = { '123': [
      { date: '2026-01-01', price: 99, currency: 'USD' },
      { date: '2026-11-11', price: 10, currency: 'USD' },
      { date: '2026-11-12', price: 9, currency: 'USD' },
    ] };
    const updated = updatePriceHistory(previous, [steamGame('123')], now, true);
    expect(updated['123']).toEqual([
      { date: '2026-11-11', price: 10, currency: 'USD' },
      { date: '2026-11-12', price: 5, currency: 'USD' },
    ]);
    expect(updatePriceHistory(updated, [steamGame('123')], now, false)['123']).toEqual(updated['123']);
    const higherLater = { ...steamGame('123'), discountPrice: 8 };
    expect(updatePriceHistory(updated, [higherLater], now, true)['123'].at(-1)?.price).toBe(5);
  });
  it('treats a failed or malformed Steam search page as incomplete', () => {
    expect(isValidSteamSearchPage({ success: 1, results_html: '' })).toBe(true);
    expect(isValidSteamSearchPage({ success: 0, results_html: '<div></div>' })).toBe(false);
    expect(isValidSteamSearchPage({ success: 1 })).toBe(false);
  });
  it('keeps a known-good Steam snapshot when a fetch fails or returns empty', () => {
    const previous = [steamGame('old')];
    expect(chooseSteamSnapshot([], previous, true)).toEqual({ games: previous, usedPrevious: true });
    expect(chooseSteamSnapshot([steamGame('partial')], previous, false)).toEqual({ games: previous, usedPrevious: true });
    expect(chooseSteamSnapshot([steamGame('new')], previous, true).games[0].id).toBe('new');
  });

  it('only plans genuinely new Game Pass entries after a baseline exists', () => {
    const games = [gamePassGame('new'), gamePassGame('popular-only', { isNew: false, isPopular: true })];
    expect(planGamePassNewEntries(games, { gamepass_old: {} }).map((game) => game.id)).toEqual(['new']);
    expect(planGamePassNewEntries(games, { gamepass_popular_old: {} })).toEqual([]);
    expect(planGamePassPopularEntries(games, { gamepass_popular_old: {} }).map((game) => game.id)).toEqual(['popular-only']);
  });

  it('does not turn missing or invalid Steam final prices into free games', () => {
    const games = new Map<string, SteamGame>();
    processCategoryItems(games, [
      { id: 1, name: 'Unknown price' },
      { id: 2, name: 'Negative price', final_price: -1 },
      { id: 3, name: 'Free', original_price: 100, final_price: 0, discount_percent: 100 },
    ], { specialBucket: true, popularBucket: false });
    expect([...games.values()].map((game) => [game.title, game.isFree])).toEqual([['Free', true]]);
  });

  it('does not advance the catalog timestamp when every source keeps its previous snapshot', () => {
    const previous = '2026-11-01T08:00:00.000Z';
    const result = resolveCatalogTimestamps({
      nowIso: '2026-11-04T12:00:00.000Z',
      oldData: {
        lastUpdated: previous,
        sourceUpdates: { steam: previous, gamepass: previous },
        steam: [steamGame('old')],
        gamepass: [gamePassGame('old')],
      },
      steamUpdated: false,
      gamepassUpdated: false,
    });

    expect(result).toEqual({
      lastUpdated: previous,
      sourceUpdates: { steam: previous, gamepass: previous },
    });
  });

  it('advances only the source that actually refreshed', () => {
    const previous = '2026-11-01T08:00:00.000Z';
    const now = '2026-11-04T12:00:00.000Z';
    const result = resolveCatalogTimestamps({
      nowIso: now,
      oldData: {
        lastUpdated: previous,
        sourceUpdates: { steam: previous, gamepass: previous },
        steam: [steamGame('old')],
        gamepass: [gamePassGame('old')],
      },
      steamUpdated: true,
      gamepassUpdated: false,
    });

    expect(result).toEqual({
      lastUpdated: now,
      sourceUpdates: { steam: now, gamepass: previous },
    });
  });

  it('derives per-source dates from lastUpdated for legacy snapshots without sourceUpdates', () => {
    const previous = '2026-11-01T08:00:00.000Z';
    const now = '2026-11-04T12:00:00.000Z';
    const result = resolveCatalogTimestamps({
      nowIso: now,
      oldData: { lastUpdated: previous, steam: [steamGame('old')], gamepass: [] },
      steamUpdated: false,
      gamepassUpdated: true,
    });

    expect(result).toEqual({
      lastUpdated: now,
      sourceUpdates: { steam: previous, gamepass: now },
    });
  });

  it('does not invent timestamps for catalogs that never existed', () => {
    expect(resolveCatalogTimestamps({
      nowIso: '2026-11-04T12:00:00.000Z',
      oldData: { lastUpdated: '' },
      steamUpdated: false,
      gamepassUpdated: false,
    })).toEqual({ lastUpdated: '', sourceUpdates: {} });
  });

  it('does not flag a free specials game as a discount (AUD-16)', () => {
    const games = new Map<string, SteamGame>();
    processCategoryItems(games, [
      { id: 10, name: 'Free weekend', original_price: 1000, final_price: 0, discount_percent: 100 },
      { id: 11, name: 'Real discount', original_price: 1000, final_price: 500, discount_percent: 50 },
    ], { specialBucket: true, popularBucket: false });

    const free = games.get('10')!;
    const discount = games.get('11')!;
    // A free game must only be announced as free, never as a "-100%" discount.
    expect(free.isFree).toBe(true);
    expect(free.isSpecial).toBe(false);
    expect(discount.isFree).toBe(false);
    expect(discount.isSpecial).toBe(true);
  });

  it('re-notifies Steam deals on >=5% price drops and freebies after 14 days while skipping queued keys', () => {
    const now = new Date('2026-11-13T12:00:00.000Z');
    const history = {
      steam_discount_1: { title: 'Drop', price: 100, percent: 30, timestamp: '2026-11-10T12:00:00.000Z', type: 'discount' as const },
      steam_discount_2: { title: 'Same', price: 100, percent: 30, timestamp: '2026-11-10T12:00:00.000Z', type: 'discount' as const },
      steam_free_3: { title: 'FreeAgain', price: 0, percent: 100, timestamp: '2026-10-25T12:00:00.000Z', type: 'free' as const },
    };
    const games: SteamGame[] = [
      { ...steamGame('1'), discountPrice: 90, discountPercent: 50, originalPrice: 180 },
      { ...steamGame('2'), discountPrice: 98, discountPercent: 30, originalPrice: 140 },
      { ...steamGame('3'), isFree: true, isSpecial: false, discountPrice: 0, discountPercent: 100, originalPrice: 200 },
      { ...steamGame('4'), discountPrice: 50, discountPercent: 80, originalPrice: 250 },
    ];
    const result = selectSteamNotifications(games, history, new Set(['steam_discount_4']), now, {
      minDiscountPercent: 25,
      freeCooldownMs: 14 * 24 * 60 * 60 * 1000,
      discountCooldownMs: 30 * 24 * 60 * 60 * 1000,
      maxDealsPerRun: 1,
    });
    expect(result.deals.map((g) => g.id)).toEqual(['1']);
    expect(result.freeGames.map((g) => g.id)).toEqual(['3']);
  });

  it('parses discount_original_price from Steam search HTML when available', () => {
    const html = `
      <a data-ds-appid="555" data-ds-itemkey="App_555">
        <span class="title">Test Game</span>
        <img src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/555/capsule.jpg?t=1">
        <div class="discount_pct">-75%</div>
        <div class="discount_original_price">1 200,00₴</div>
        <div data-price-final="30000">300₴</div>
      </a>`;
    const map = new Map<string, SteamGame>();
    expect(parseSearchHtml(html, map)).toBe(1);
    expect(map.get('555')?.originalPrice).toBe(1200);
    expect(map.get('555')?.discountPrice).toBe(300);
  });
});
