import { Send, X } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function TelegramBanner() {
  const { t } = useLocale();
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>('telegram-banner-dismissed', false);

  if (isDismissed) return null;

  return (
    <section className="telegram-banner" aria-label="Telegram канал">
      <div className="tg-info">
        <h3>
          <Send size={22} className="text-telegram" aria-hidden="true" />
          {' '}{t.telegram.title}
        </h3>
        <p>
          {t.telegram.desc}
        </p>
      </div>
      <div className="tg-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a
          href="https://t.me/salesgamesua"
          target="_blank"
          rel="noopener noreferrer"
          className="tg-button"
          aria-label={t.telegram.subscribe}
        >
          <Send size={18} aria-hidden="true" /> {t.telegram.subscribe}
        </a>
        <button
          type="button"
          className="dismiss-btn"
          onClick={() => setIsDismissed(true)}
          aria-label={t.telegram.dismiss}
        >
          <X size={18} />
        </button>
      </div>
    </section>
  );
}
