/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DealsData, GamePassGame, NotifiedItem, SteamGame } from './types';

// deals.json генерується із зовнішнього Steam API, тому елемент може не мати
// полів (напр. upstream пропустив title). Нормалізуємо КОЖЕН елемент,
// щоб один битий запис не клав UI через .filter()/.toLowerCase()/ціни.
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

function normalizeSteam(g: Record<string, unknown>): SteamGame {
  const originalPrice = num(g.originalPrice);
  const discountPrice = num(g.discountPrice);
  return {
    id: str(g.id),
    title: str(g.title),
    imageUrl: str(g.imageUrl),
    originalPrice,
    discountPrice,
    discountPercent: num(g.discountPercent),
    currency: str(g.currency),
    url: str(g.url),
    isSpecial: Boolean(g.isSpecial),
    isFree: typeof g.isFree === 'boolean' ? g.isFree : originalPrice > 0 && discountPrice === 0,
    isPopular: Boolean(g.isPopular),
  };
}

function isValidSteamRecord(g: Record<string, unknown>): boolean {
  return typeof g.id === 'string' && g.id.trim().length > 0 &&
    typeof g.title === 'string' && g.title.trim().length > 0 &&
    typeof g.originalPrice === 'number' && Number.isFinite(g.originalPrice) && g.originalPrice >= 0 &&
    typeof g.discountPrice === 'number' && Number.isFinite(g.discountPrice) && g.discountPrice >= 0 &&
    typeof g.discountPercent === 'number' && Number.isFinite(g.discountPercent) && g.discountPercent >= 0 && g.discountPercent <= 100 &&
    typeof g.currency === 'string' && /^[A-Z]{3}$/.test(g.currency) &&
    typeof g.url === 'string' && /^https:\/\/store\.steampowered\.com\/app\//.test(g.url);
}

function isValidGamePassRecord(g: Record<string, unknown>): boolean {
  return typeof g.id === 'string' && g.id.trim().length > 0 &&
    typeof g.title === 'string' && g.title.trim().length > 0 &&
    typeof g.url === 'string' && /^https:\/\/(?:www\.)?xbox\.com\//.test(g.url) &&
    typeof g.isNew === 'boolean' && typeof g.isPopular === 'boolean';
}

function normalizeGamePass(g: Record<string, unknown>): GamePassGame {
  // Каталог Microsoft віддає protocol-relative зображення (`//store-images…`);
  // safeUrl у картці такі відкидає, тому одразу робимо https.
  const rawImage = str(g.imageUrl);
  return {
    id: str(g.id),
    title: str(g.title),
    imageUrl: rawImage.startsWith('//') ? `https:${rawImage}` : rawImage,
    url: str(g.url),
    description: str(g.description) || undefined,
    isNew: Boolean(g.isNew),
    isPopular: Boolean(g.isPopular),
  };
}

function normalizeList<T>(
  raw: unknown,
  normalize: (g: Record<string, unknown>) => T,
  validate: (g: Record<string, unknown>) => boolean,
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is Record<string, unknown> => {
      const ok = !!g && typeof g === 'object' && validate(g as Record<string, unknown>);
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

// M2: notifiedHistory нормалізується так само як steam — сирий timestamp/
// percent з отруєного deals.json ламав сортування (-NaN%) в HistoryPage.
function normalizeHistory(raw: unknown): Record<string, NotifiedItem> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, NotifiedItem> = {};
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== 'string' || !v || typeof v !== 'object') continue;
    const item = v as Record<string, unknown>;
    if (typeof item.title !== 'string') continue;
    // Легасі-тип xbox_new (до перезапуску Game Pass) мапимо на gamepass.
    const rawType = item.type === 'xbox_new' ? 'gamepass' : item.type;
    const type = rawType === 'free' || rawType === 'discount' || rawType === 'popular' || rawType === 'gamepass' ? rawType : 'discount';
    const ts = typeof item.timestamp === 'string' && !Number.isNaN(Date.parse(item.timestamp)) ? item.timestamp : '';
    out[key] = { title: item.title, price: num(item.price), percent: num(item.percent), timestamp: ts, type };
  }
  return out;
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
  const hasData = useRef(false);
  const lastAttemptAt = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let inFlight = false;

    const fetchData = async () => {
      if (disposed || inFlight) return;
      inFlight = true;
      lastAttemptAt.current = Date.now();
      try {
        if (!hasData.current) setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}data/deals.json`, {
          cache: 'no-cache',
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Не вдалося завантажити дані (статус: ${res.status})`);
        }
        const raw: unknown = await res.json();
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new Error('Формат файлу пропозицій некоректний.');
        }
        const source = raw as Record<string, unknown>;
        if (!Array.isArray(source.steam) || (source.gamepass !== undefined && !Array.isArray(source.gamepass))) {
          throw new Error('Формат файлу пропозицій некоректний.');
        }
        // Нормалізуємо форму замість сліпого `as DealsData`:
        // частковий/пошкоджений файл не повинен ламати .filter() в UI.
        // Поле `epic` ігнорується (лишилось у старих deals.json до переходу на Steam-only).
        const jsonData: DealsData = {
          lastUpdated: typeof source.lastUpdated === 'string' && !Number.isNaN(Date.parse(source.lastUpdated)) ? source.lastUpdated : '',
          steam: normalizeList(source.steam, normalizeSteam, isValidSteamRecord),
          gamepass: normalizeList(source.gamepass, normalizeGamePass, isValidGamePassRecord),
          notifiedHistory: normalizeHistory(source.notifiedHistory),
        };
        setData(jsonData);
        hasData.current = true;
        setError(null);
      } catch (err: unknown) {
        if (controller.signal.aborted || disposed) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Сталася помилка при завантаженні знижок.';
        console.error('Помилка завантаження даних:', err);
        if (!hasData.current) setError(message);
      } finally {
        inFlight = false;
        if (!controller.signal.aborted && !disposed) setLoading(false);
      }
    };

    fetchData();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastAttemptAt.current >= 5 * 60 * 1000) fetchData();
    };
    const refreshInterval = window.setInterval(fetchData, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('online', fetchData);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('online', fetchData);
    };
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
