import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => value is T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
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
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch { /* storage full, ignore */ }
        return valueToStore;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
