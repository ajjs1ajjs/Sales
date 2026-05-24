import { ExternalLink, Tag, TrendingUp } from 'lucide-react';
import type { EpicGame, SteamGame } from '../types';

type Game = EpicGame | SteamGame;

interface BaseProps {
  platform: 'epic' | 'steam';
  badge?: string;
  badgeVariant?: 'free' | 'discount';
  showTagDescription?: boolean;
  showTrendingDescription?: boolean;
  isUpcoming?: boolean;
  linkText?: string;
}

type Props = BaseProps & { game: Game };

function isEpicGame(game: Game): game is EpicGame {
  return 'isFreeNow' in game && 'isUpcomingFree' in game;
}

function formatPrice(price: number, currency: string): string {
  if (!price && price !== 0) return '';
  const formattedPrice = price % 1 === 0 ? price : price.toFixed(2);
  if (currency === 'UAH') return `${formattedPrice} грн`;
  if (currency === 'USD') return `$${formattedPrice}`;
  return `${formattedPrice} ${currency}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Kyiv',
    };
    return d.toLocaleDateString('uk-UA', options);
  } catch {
    return dateStr;
  }
}

export function GameCard({
  game,
  platform,
  badge,
  badgeVariant,
  showTagDescription,
  showTrendingDescription,
  isUpcoming,
  linkText = 'Придбати',
}: Props) {
  return (
    <article
      className={`game-card${isUpcoming ? ' game-card--upcoming' : ''}`}
      aria-label={`${game.title} — ${platform === 'epic' ? 'Epic Games' : 'Steam'}`}
    >
      <div className="card-image-wrapper">
        <span className={`platform-badge ${platform}`}>
          {platform === 'epic' ? 'Epic Games' : 'Steam'}
        </span>
        {badge && (
          <span className={`deal-badge${badgeVariant ? ` ${badgeVariant}` : ''}`}>
            {badge}
          </span>
        )}
        <img
          src={game.imageUrl}
          alt={game.title}
          className="card-image"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="card-content">
        <h4 className="card-title" title={game.title}>
          {game.title}
        </h4>

        {isEpicGame(game) && game.description && !showTagDescription && !showTrendingDescription && (
          <p className="card-desc">{game.description}</p>
        )}

        {showTagDescription && (
          <p className="card-desc card-desc--with-icon">
            <Tag size={14} aria-hidden="true" />{' '}
            {platform === 'epic'
              ? 'Тимчасова знижка в Epic Games Store.'
              : 'Найкращі акційні пропозиції у Steam.'}
          </p>
        )}

        {showTrendingDescription && (
          <p className="card-desc card-desc--with-icon">
            <TrendingUp size={14} aria-hidden="true" /> Хіт продажів прямо зараз.
          </p>
        )}

        {isUpcoming && (
          <p className="card-desc">
            <span className="upcoming-status">
              З {formatDate((game as EpicGame).startDate)}
            </span>
          </p>
        )}

        <div className="card-footer">
          <div className="price-container">
            {'originalPrice' in game && game.originalPrice > 0 && (
              <span className="price-original">
                {formatPrice(game.originalPrice, game.currency)}
              </span>
            )}
            {'isFreeNow' in game && game.isFreeNow ? (
              <span className="price-current free-text">БЕЗКОШТОВНО</span>
            ) : (
              <span className="price-current">
                {formatPrice(game.discountPrice, game.currency)}
              </span>
            )}
          </div>
          <a
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="store-link"
            aria-label={`${linkText} ${game.title}`}
          >
            {linkText} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
