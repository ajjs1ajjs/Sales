import { Send } from 'lucide-react';

export function TelegramBanner() {
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
      <a
        href="https://t.me/salesgamesua"
        target="_blank"
        rel="noopener noreferrer"
        className="tg-button"
        aria-label="Підписатися на Telegram-канал"
      >
        <Send size={18} aria-hidden="true" /> Підписатися
      </a>
    </section>
  );
}
