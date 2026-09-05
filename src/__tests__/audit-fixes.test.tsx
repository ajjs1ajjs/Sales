import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LocaleProvider } from '../contexts/LocaleContext';

// The test runtime's built-in localStorage is unreliable here, so install a
// simple in-memory mock that useLocalStorage (which reads window.localStorage)
// and the test seeding both share.
function installLocalStorageMock() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: mock, configurable: true, writable: true });
  return mock;
}

describe('audit fixes', () => {
  beforeEach(() => {
    installLocalStorageMock();
    document.documentElement.lang = 'uk';
  });

  describe('useLocalStorage shape validation', () => {
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((x) => typeof x === 'string');

    it('falls back to initialValue when the stored value fails validation', () => {
      window.localStorage.setItem('wishlist', JSON.stringify({ not: 'an array' }));
      const { result } = renderHook(() => useLocalStorage<string[]>('wishlist', [], isStringArray));
      expect(result.current[0]).toEqual([]);
    });

    it('falls back when stored JSON is corrupt', () => {
      window.localStorage.setItem('k', '{bad json');
      const { result } = renderHook(() => useLocalStorage<string[]>('k', ['default']));
      expect(result.current[0]).toEqual(['default']);
    });

    it('keeps a valid stored value', () => {
      window.localStorage.setItem('wishlist', JSON.stringify(['a', 'b']));
      const { result } = renderHook(() => useLocalStorage<string[]>('wishlist', [], isStringArray));
      expect(result.current[0]).toEqual(['a', 'b']);
    });
  });

  describe('LocaleProvider syncs <html lang> on mount', () => {
    it('sets document lang to the initial locale (en)', () => {
      act(() => {
        render(<LocaleProvider initialLocale="en">{null}</LocaleProvider>);
      });
      expect(document.documentElement.lang).toBe('en');
    });

    it('sets document lang to uk for uk locale', () => {
      act(() => {
        render(<LocaleProvider initialLocale="uk">{null}</LocaleProvider>);
      });
      expect(document.documentElement.lang).toBe('uk');
    });
  });
});
