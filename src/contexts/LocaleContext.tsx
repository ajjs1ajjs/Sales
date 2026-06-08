/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { uk } from '../locales/uk';
import { en } from '../locales/en';
import type { Translations } from '../locales/uk';

export type Locale = 'uk' | 'en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const translations: Record<Locale, Translations> = { uk, en };

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved === 'uk' || saved === 'en') return saved;
    const browserLang = navigator.language?.slice(0, 2);
    if (browserLang === 'en') return 'en';
  } catch {
    /* ignore */
  }
  return 'uk';
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('locale', l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
