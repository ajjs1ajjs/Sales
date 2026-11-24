import { describe, expect, it } from 'vitest';
import {
  choosePlayStationSnapshot,
  chooseSteamSnapshot,
  filterQualitySteamGames,
  isValidSteamSearchPage,
  partitionMegaSteamDeals,
  planGamePassNewEntries,
  planGamePassPopularEntries,
  planPlayStationNotifications,
  resolveCatalogTimestamps,
  selectSteamNotifications,
  updatePriceHistory,
} from '../collector-core';
import type { GamePassGame, PlayStationGame, SteamGame } from '../../src/types';
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

  it('parses Steam search HTML when discount_pct and title include extra HTML attributes', () => {
    const html = `
      <a href="https://store.steampowered.com/app/777/" data-ds-appid="777" data-ds-itemkey="App_777">
        <div class="col search_capsule"><img src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/777/capsule_sm_120.jpg?t=1"></div>
        <span class="title" dir="auto">Attribute Game</span>
        <div class="discount_block search_discount_block" data-price-final="10000" data-bundlediscount="0" data-discount="75">
          <div class="discount_pct" aria-hidden="true" data-tooltip-text="Тимчасова знижка, що зменшує звичайну ціну.">-75%</div>
          <div class="discount_prices" aria-hidden="true">
            <div class="discount_original_price" aria-hidden="true">400,00₴</div>
            <div class="discount_final_price">100,00₴</div>
          </div>
        </div>
      </a>`;
    const map = new Map<string, SteamGame>();
    expect(parseSearchHtml(html, map)).toBe(1);
    expect(map.get('777')).toMatchObject({
      id: '777',
      title: 'Attribute Game',
      discountPercent: 75,
      originalPrice: 400,
      discountPrice: 100,
    });
  });

  it('filters Steam deals by review quality and excludes cosmetic/OST DLC junk', () => {
    const now = new Date('2026-11-24T12:00:00Z');
    const games: SteamGame[] = [
      { ...steamGame('1'), title: 'Great Hit', discountPercent: 50, isPopular: true, popularRank: 1 },
      { ...steamGame('2'), title: 'Obscure Shovelware', discountPercent: 80, isPopular: false },
      { ...steamGame('3'), title: 'Mixed Reviews', discountPercent: 60, isPopular: false },
      { ...steamGame('4'), title: 'Phantom Liberty', isDlc: true, originalPrice: 799, discountPrice: 559, discountPercent: 30, currency: 'UAH' },
      { ...steamGame('5'), title: 'Game Original Soundtrack', isDlc: true, originalPrice: 300, discountPrice: 150, discountPercent: 50, currency: 'UAH' },
    ];
    const meta = new Map([
      ['1', { type: 0, reviewCount: 25000, reviewPercent: 92 }],
      ['2', { type: 0, reviewCount: 40, reviewPercent: 85 }],
      ['3', { type: 0, reviewCount: 2000, reviewPercent: 55 }],
      ['4', { type: 4, reviewCount: 22000, reviewPercent: 89, parentAppId: '1091500' }],
      ['5', { type: 4, reviewCount: 500, reviewPercent: 90, parentAppId: '1' }],
    ]);

    const filtered = filterQualitySteamGames(games, meta, now, {
      minDiscountPercent: 30,
      topSellerMinDiscountPercent: 25,
      minReviewPercent: 70,
      minReviewCount: 500,
      newReleaseDays: 45,
      newReleaseMinReviews: 100,
      popularMinReviewPercent: 65,
      popularMinReviewCount: 100,
      dlcMinDiscountPercent: 25,
      dlcMinReviewCount: 300,
      dlcMinReviewPercent: 70,
      dlcMinOriginalPriceUah: 120,
    });
    expect(filtered.map((g) => g.id)).toEqual(['1', '4']);
  });

  it('splits mega-hits from regular Steam deals and plans PlayStation notifications', () => {
    const deals: SteamGame[] = [
      { ...steamGame('10'), discountPercent: 60, reviewCount: 15000, reviewPercent: 91 },
      { ...steamGame('11'), discountPercent: 35, reviewCount: 1200, reviewPercent: 82 },
    ];
    const { megaDeals, digestDeals } = partitionMegaSteamDeals(deals, 3);
    expect(megaDeals.map((d) => d.id)).toEqual(['10']);
    expect(digestDeals.map((d) => d.id)).toEqual(['11']);

    const psGames: PlayStationGame[] = [
      {
        id: 'ps_essential_dead-island-2',
        title: 'Dead Island 2',
        imageUrl: '',
        url: 'https://store.playstation.com/uk-ua/search/Dead%20Island%202',
        isDeal: false,
        isPopular: false,
        psPlusTier: 'essential',
      },
      {
        id: 'EP0006-PPSA23566_00-BASEUFC6GAME0000',
        title: 'UFC 6',
        imageUrl: '',
        url: 'https://store.playstation.com/uk-ua/product/EP0006-PPSA23566_00-BASEUFC6GAME0000',
        originalPrice: 2599,
        discountPrice: 1559.4,
        discountPercent: 40,
        currency: 'UAH',
        isDeal: true,
        isPopular: true,
        popularRank: 1,
      },
    ];
    const plan = planPlayStationNotifications(
      psGames,
      { ps_essential_old: { title: 'Old', price: 0, percent: 100, timestamp: '2026-10-01T00:00:00Z', type: 'ps_essential' } },
      new Set(),
      new Date('2026-11-24T12:00:00Z'),
      { minDiscountPercent: 25, discountCooldownMs: 30 * 86400000, maxDealsPerRun: 5 },
    );
    expect(plan.essential.map((g) => g.id)).toEqual(['ps_essential_dead-island-2']);
    expect(plan.deals.map((g) => g.id)).toEqual(['EP0006-PPSA23566_00-BASEUFC6GAME0000']);
    expect(choosePlayStationSnapshot([], psGames, false).usedPrevious).toBe(true);
  });
});
