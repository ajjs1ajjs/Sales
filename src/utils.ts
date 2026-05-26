import type { EpicGame, SteamGame } from './types';

export type Game = EpicGame | SteamGame;

export function isEpicGame(game: Game): game is EpicGame {
  return 'isFreeNow' in game && 'isUpcomingFree' in game;
}

export function formatPrice(price: number, currency: string): string {
  if (!price && price !== 0) return '';
  const formattedPrice = price % 1 === 0 ? price : price.toFixed(2);
  if (currency === 'UAH') return `${formattedPrice} грн`;
  if (currency === 'USD') return `$${formattedPrice}`;
  return `${formattedPrice} ${currency}`;
}

export function formatDate(dateStr: string, includeTime = false): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: includeTime ? 'long' : 'short',
      year: includeTime ? 'numeric' : undefined,
      hour: includeTime ? '2-digit' : '2-digit',
      minute: includeTime ? '2-digit' : '2-digit',
      timeZone: 'Europe/Kyiv',
    };
    if (!includeTime) {
      delete options.year;
      delete options.hour;
      delete options.minute;
      return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', timeZone: 'Europe/Kyiv' });
    }
    return d.toLocaleString('uk-UA', options);
  } catch {
    return dateStr;
  }
}

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

export function isSteamNonGame(imageUrl: string): boolean {
  return imageUrl.includes('/bundles/') || imageUrl.includes('/subs/');
}
