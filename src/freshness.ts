import type { SourceUpdates } from './types';

/** Scheduler runs hourly; six missed runs means the source is visibly stale. */
export const SOURCE_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export interface StaleSource {
  key: 'steam' | 'gamepass' | 'playstation';
  label: string;
  date: string;
}

export function findStaleSources(
  sourceUpdates: SourceUpdates | undefined,
  now = Date.now(),
): StaleSource[] {
  if (!sourceUpdates) return [];
  const sources = [
    ['steam', 'Steam'],
    ['gamepass', 'Game Pass'],
    ['playstation', 'PlayStation 5'],
  ] as const;
  return sources.flatMap(([key, label]) => {
    const value = sourceUpdates[key];
    if (!value) return [];
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp) || now - timestamp <= SOURCE_STALE_AFTER_MS) return [];
    return [{ key, label, date: value }];
  });
}
