import type { GamePassGame, SteamGame } from '../src/types';

export function chooseSteamSnapshot(
  fresh: SteamGame[],
  previous: SteamGame[],
  fetchSucceeded: boolean,
): { games: SteamGame[]; usedPrevious: boolean } {
  if (previous.length > 0 && (!fetchSucceeded || fresh.length === 0)) {
    return { games: previous, usedPrevious: true };
  }
  return { games: fresh, usedPrevious: false };
}

export function planGamePassNewEntries(games: GamePassGame[], history: Record<string, unknown>): GamePassGame[] {
  const hasNewBaseline = Object.keys(history).some((key) => key.startsWith('gamepass_') && !key.startsWith('gamepass_popular_'));
  if (!hasNewBaseline) return [];
  return games.filter((game) => game.isNew && !history[`gamepass_${game.id}`]);
}

export function planGamePassPopularEntries(games: GamePassGame[], history: Record<string, unknown>): GamePassGame[] {
  const hasPopularBaseline = Object.keys(history).some((key) => key.startsWith('gamepass_popular_'));
  if (!hasPopularBaseline) return [];
  return games.filter((game) => game.isPopular && !history[`gamepass_popular_${game.id}`]);
}
