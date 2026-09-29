import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { ThemeToggle } from '../ThemeToggle';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider initialLocale="uk">{children}</LocaleProvider>;
}

// The test runtime ships no working localStorage — install a shared in-memory
// mock so the seeded value is the one useLocalStorage reads.
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
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    installLocalStorageMock();
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies the persisted theme on mount', () => {
    window.localStorage.setItem('theme', JSON.stringify('light'));
    render(<ThemeToggle />, { wrapper: Wrapper });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('defaults to dark and toggles the DOM attribute', () => {
    render(<ThemeToggle />, { wrapper: Wrapper });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
