import { describe, expect, it } from 'vitest';
import { chooseSteamSnapshot, isValidSteamSearchPage, planGamePassNewEntries, planGamePassPopularEntries } from '../collector-core';
import type { GamePassGame, SteamGame } from '../../src/types';
import { processCategoryItems } from '../fetch-deals';

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
});
