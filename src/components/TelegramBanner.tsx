import { Send, X } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function TelegramBanner() {
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>('telegram-banner-dismissed', false);

  if (isDismissed) return null;

  return (
    <section className="telegram-banner" aria-label="Telegram канал">
      <div className="tg-info">
        <h3>
          <Send size={22} className="text-telegram" aria-hidden="true" />
          {' '}Приєднуйтесь до нашого Telegram-каналу!
        </h3>
        <p>
          Отримуйте миттєві сповіщення про безкоштовні ігри, будь-які знижки
          Steam, нові релізи та хіти продажів щогодини.
        </p>
      </div>
      <div className="tg-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a
          href="https://t.me/salesgamesua"
          target="_blank"
          rel="noopener noreferrer"
          className="tg-button"
          aria-label="Підписатися на Telegram-канал"
        >
          <Send size={18} aria-hidden="true" /> Підписатися
        </a>
        <button
          type="button"
          className="install-dismiss"
          onClick={() => setIsDismissed(true)}
          aria-label="Приховати банер Telegram-каналу"
        >
          <X size={18} />
        </button>
      </div>
    </section>
  );
}
