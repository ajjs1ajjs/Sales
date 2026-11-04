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

function normalizeSourceUpdates(raw: unknown): DealsData['sourceUpdates'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const steam = typeof obj.steam === 'string' && !Number.isNaN(Date.parse(obj.steam)) ? obj.steam : undefined;
  const gamepass = typeof obj.gamepass === 'string' && !Number.isNaN(Date.parse(obj.gamepass)) ? obj.gamepass : undefined;
  if (!steam && !gamepass) return undefined;
  return { steam, gamepass };
}

export interface DataContextValue {
  data: DealsData | null;
  loading: boolean;
  error: string | null;
  refreshError: string | null;
  lastFetchedAt: number | null;
}

class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Не вдалося завантажити дані (статус: ${status})`);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DealsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const hasData = useRef(false);
  const lastAttemptAt = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let inFlight = false;
    let retryTimer: number | undefined;

    const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    const fetchData = async () => {
      if (disposed || inFlight) return;
      inFlight = true;
      lastAttemptAt.current = Date.now();
      try {
        if (!hasData.current) setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        let raw: unknown = undefined;
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          const attemptController = new AbortController();
          const onParentAbort = () => attemptController.abort();
          controller.signal.addEventListener('abort', onParentAbort);
          // timeout covers body parsing too
          let timeoutTimer: number | undefined;
          const timeout = new Promise<never>((_, reject) => {
            timeoutTimer = window.setTimeout(() => {
              reject(new Error('Перевищено час очікування відповіді сервера.'));
              attemptController.abort();
            }, 8000);
          });

          try {
            raw = await Promise.race([
              (async () => {
                const response = await fetch(`${baseUrl}data/deals.json`, {
                  cache: 'no-cache',
                  signal: attemptController.signal,
                });
                if (!response.ok) {
                  void response.body?.cancel().catch(() => {});
                  throw new HttpStatusError(response.status);
                }
                // Keep the timeout armed while the body is read.
                return await response.json();
              })(),
              timeout,
            ]);
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err;
            if (controller.signal.aborted || disposed) throw err;
            // Retry only transport failures and 5xx; 4xx will not heal by itself.
            const retryable = !(err instanceof HttpStatusError) || err.status >= 500;
            if (!retryable || attempt === 2) throw err;
          } finally {
            if (timeoutTimer !== undefined) window.clearTimeout(timeoutTimer);
            controller.signal.removeEventListener('abort', onParentAbort);
          }
          // GitHub Pages can briefly return 5xx while publishing. Retry before
          // surfacing an error so visitors do not need to hard-refresh.
          await wait(500 * (attempt + 1));
        }
        if (lastError) throw lastError;
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
          sourceUpdates: normalizeSourceUpdates(source.sourceUpdates),
          steam: normalizeList(source.steam, normalizeSteam, isValidSteamRecord),
          gamepass: normalizeList(source.gamepass, normalizeGamePass, isValidGamePassRecord),
          notifiedHistory: normalizeHistory(source.notifiedHistory),
        };
        setData(jsonData);
        hasData.current = true;
        setError(null);
        setRefreshError(null);
        setLastFetchedAt(Date.now());
        if (retryTimer !== undefined) {
          window.clearTimeout(retryTimer);
          retryTimer = undefined;
        }
      } catch (err: unknown) {
        if (controller.signal.aborted || disposed) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Сталася помилка при завантаженні знижок.';
        console.error('Помилка завантаження даних:', err);
        if (!hasData.current) {
          setError(message);
          // Keep retrying in the background if the initial request failed
          // throughout the short retry window.
          retryTimer = window.setTimeout(() => {
            retryTimer = undefined;
            fetchData();
          }, 30_000);
        } else {
          setRefreshError(message);
        }
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
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('online', fetchData);
    };
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error, refreshError, lastFetchedAt }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
