import { Languages } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  const toggle = () => {
    setLocale(locale === 'uk' ? 'en' : 'uk');
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={locale === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
      title={locale === 'uk' ? 'English' : 'Українська'}
    >
      <Languages size={18} />
      <span style={{ fontSize: '0.75rem', fontWeight: 600, marginLeft: 4 }}>
        {locale === 'uk' ? 'EN' : 'UK'}
      </span>
    </button>
  );
}
