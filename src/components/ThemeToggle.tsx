import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

type Theme = 'dark' | 'light';

const isValidTheme = (v: unknown): v is Theme => v === 'dark' || v === 'light';

export function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'dark', isValidTheme);

  // Keep the DOM attribute in sync with the stored theme: applies the persisted
  // value on mount/reload and mirrors cross-tab `storage` updates.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      className="header-btn"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t.theme.switchToLight : t.theme.switchToDark}
      title={theme === 'dark' ? t.theme.light : t.theme.dark}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
