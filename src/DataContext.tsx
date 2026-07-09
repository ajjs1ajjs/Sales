/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DealsData, EpicGame, SteamGame } from './types';

// deals.json is generated from external Epic/Steam APIs, so an element can be
// missing fields (e.g. an upstream API omits a title). Normalize EVERY element
// — not just the array shape — so a single malformed item can't crash the UI's
// .filter()/.toLowerCase()/price math.
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

function normalizeEpic(g: Record<string, unknown>): EpicGame {
  return {
    id: str(g.id),
    title: str(g.title),
    description: str(g.description),
    imageUrl: str(g.imageUrl),
    originalPrice: num(g.originalPrice),
    discountPrice: num(g.discountPrice),
    currency: str(g.currency),
    url: str(g.url),
    startDate: str(g.startDate),
    endDate: str(g.endDate),
    isFreeNow: Boolean(g.isFreeNow),
    isUpcomingFree: Boolean(g.isUpcomingFree),
    isDiscounted: Boolean(g.isDiscounted),
    discountPercent: num(g.discountPercent),
  };
}

function normalizeSteam(g: Record<string, unknown>): SteamGame {
  return {
    id: str(g.id),
    title: str(g.title),
    imageUrl: str(g.imageUrl),
    originalPrice: num(g.originalPrice),
    discountPrice: num(g.discountPrice),
    discountPercent: num(g.discountPercent),
    currency: str(g.currency),
    url: str(g.url),
    isSpecial: Boolean(g.isSpecial),
    isPopular: Boolean(g.isPopular),
  };
}

function normalizeList<T>(raw: unknown, normalize: (g: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is Record<string, unknown> => {
      const ok = !!g && typeof g === 'object' && typeof (g as { title?: unknown }).title === 'string';
      if (!ok) {
        if (import.meta.env.DEV) {
          const id = typeof g === 'object' && g !== null ? (g as Record<string, unknown>).id ?? 'unknown' : 'unknown';
          console.warn('DataContext: skipping entry without a valid title (id=%s)', id);
        }
      }
      return ok;
    })
    .map(normalize);
}

interface DataContextValue {
  data: DealsData | null;
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DealsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}data/deals.json`, {
          cache: 'no-cache',
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Не вдалося завантажити дані (статус: ${res.status})`);
        }
        const raw = await res.json();
        // Нормалізуємо форму замість сліпого `as DealsData`:
        // частковий/пошкоджений файл не повинен ламати .filter() в UI.
        const jsonData: DealsData = {
          lastUpdated: typeof raw?.lastUpdated === 'string' ? raw.lastUpdated : '',
          epic: normalizeList(raw?.epic, normalizeEpic),
          steam: normalizeList(raw?.steam, normalizeSteam),
          notifiedHistory:
            raw?.notifiedHistory && typeof raw.notifiedHistory === 'object'
              ? raw.notifiedHistory
              : {},
        };
        setData(jsonData);
        setError(null);
      } catch (err: unknown) {
        if (controller.signal.aborted) return; // компонент розмонтовано — ігноруємо
        const message =
          err instanceof Error
            ? err.message
            : 'Сталася помилка при завантаженні знижок.';
        console.error('Помилка завантаження даних:', err);
        setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
