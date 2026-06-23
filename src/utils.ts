import type { EpicGame, SteamGame, SortType } from './types';

export type Game = EpicGame | SteamGame;

export function isEpicGame(game: Game): game is EpicGame {
  return 'isFreeNow' in game && 'isUpcomingFree' in game;
}

export { formatPrice, formatDate } from './shared/format';

export function formatLastUpdated(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Kyiv',
    };
    return d.toLocaleString('uk-UA', options);
  } catch {
    return dateStr;
  }
}

export function formatDateEn(dateStr: string, includeTime = false): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const tz = 'Europe/Kyiv';
    if (includeTime) {
      return d.toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: tz });
    }
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: tz });
  } catch {
    return dateStr;
  }
}

export function formatLastUpdatedEn(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Kyiv',
    };
    return d.toLocaleString('en-US', options);
  } catch {
    return dateStr;
  }
}

export function isSteamNonGame(imageUrl: string): boolean {
  return imageUrl.includes('/bundles/') || imageUrl.includes('/subs/');
}

/**
 * Повертає URL лише якщо він має безпечну http(s)-схему.
 * Захист від javascript:/data: у href та src, якщо джерело даних скомпрометоване.
 */
export function safeUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

export function interp(template: string): { text: string; key: string | null }[] {
  const parts: { text: string; key: string | null }[] = [];
  let remaining = template;
  while (remaining.length > 0) {
    const match = remaining.match(/\{(\w+)\}/);
    if (!match) {
      parts.push({ text: remaining, key: null });
      break;
    }
    const before = remaining.slice(0, match.index);
    if (before) parts.push({ text: before, key: null });
    parts.push({ text: match[0], key: match[1] });
    remaining = remaining.slice(match.index! + match[0].length);
  }
  return parts;
}

export function sortGames<T extends EpicGame | SteamGame>(games: T[], sortType: SortType): T[] {
  switch (sortType) {
    case 'name-asc':
      return games.toSorted((a, b) => a.title.localeCompare(b.title));
    case 'name-desc':
      return games.toSorted((a, b) => b.title.localeCompare(a.title));
    case 'price-asc':
      return games.toSorted((a, b) => a.discountPrice - b.discountPrice);
    case 'price-desc':
      return games.toSorted((a, b) => b.discountPrice - a.discountPrice);
    case 'discount-desc':
      return games.toSorted((a, b) => b.discountPercent - a.discountPercent);
    default:
      return games;
  }
}
