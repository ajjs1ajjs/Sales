import { Sun, Moon } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t.theme.switchToLight : t.theme.switchToDark}
      title={theme === 'dark' ? t.theme.light : t.theme.dark}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
