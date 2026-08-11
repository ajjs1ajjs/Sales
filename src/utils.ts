import type { EpicGame, SteamGame, XboxGame, SortType } from './types';

export type Game = EpicGame | SteamGame | XboxGame;

export function isEpicGame(game: Game): game is EpicGame {
  return 'isFreeNow' in game && 'isUpcomingFree' in game;
}

export function isXboxGame(game: Game): game is XboxGame {
  return 'isGamePass' in game;
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
  // Protocol-relative URLs (//evil.com) resolve to the current scheme and
  // would pass the http/https check below; reject them explicitly.
  if (url.startsWith('//')) return '';
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

export function interp(template: string): { text: string; key: string | null }[] {
  const parts: { text: string; key: string | null }[] = [];
  let lastIndex = 0;
  template.replace(/\{(\w+)\}/g, (match, key, offset) => {
    if (offset > lastIndex) parts.push({ text: template.slice(lastIndex, offset), key: null });
    parts.push({ text: match, key });
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < template.length) parts.push({ text: template.slice(lastIndex), key: null });
  return parts;
}

export function sortGames<T extends EpicGame | SteamGame | XboxGame>(games: T[], sortType: SortType): T[] {
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
