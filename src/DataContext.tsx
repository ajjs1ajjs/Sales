/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DealsData } from './types';

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
          epic: Array.isArray(raw?.epic) ? raw.epic : [],
          steam: Array.isArray(raw?.steam) ? raw.steam : [],
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
