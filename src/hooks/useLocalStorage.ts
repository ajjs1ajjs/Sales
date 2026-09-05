import { useState, useCallback, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => value is T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed: unknown = JSON.parse(item);
      // Don't trust the stored shape (corrupt/partial write, devtools edit, or
      // another script on the origin) — fall back if it fails validation.
      if (validate && !validate(parsed)) return initialValue;
      return parsed as T;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
        } catch { /* storage full, ignore */ }
        return valueToStore;
      });
    },
    [key],
  );

  // Cross-tab sync: react to storage events from other tabs/windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      if (e.newValue === null) {
        if (validate && !validate(initialValue)) return;
        setStoredValue(initialValue);
        return;
      }
      try {
        const parsed: unknown = JSON.parse(e.newValue);
        if (validate && !validate(parsed)) return;
        setStoredValue(parsed as T);
      } catch { /* ignore corrupt */ }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, initialValue, validate]);

  return [storedValue, setValue];
}
