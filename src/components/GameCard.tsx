import { useState } from 'react';
import { ExternalLink, Tag, TrendingUp } from 'lucide-react';
import type { EpicGame, SteamGame } from '../types';
import { formatPrice, formatDate, isEpicGame } from '../utils';
import { WishlistButton } from './WishlistButton';

export type Game = EpicGame | SteamGame;

interface BaseProps {
  platform: 'epic' | 'steam';
  badge?: string;
  badgeVariant?: 'free' | 'discount';
  showTagDescription?: boolean;
  showTrendingDescription?: boolean;
  isUpcoming?: boolean;
  linkText?: string;
  searchQuery?: string;
}

type Props = BaseProps & { game: Game };

const FALLBACK_IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22225%22%3E%3Crect fill=%22%23100d1a%22 width=%22400%22 height=%22225%22/%3E%3Ctext fill=%22%23555%22 x=%22200%22 y=%22120%22 text-anchor=%22middle%22 font-size=%2214%22%3EЗображення недоступне%3C/text%3E%3C/svg%3E';

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="highlighted-text">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
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
  searchQuery = '',
}: Props) {
  const [imgError, setImgError] = useState(false);

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
          src={imgError ? FALLBACK_IMG : game.imageUrl}
          alt={game.title}
          className="card-image"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      </div>
      <div className="card-content">
        <div className="card-title-row">
          <h4 className="card-title" title={game.title}>
            {highlightText(game.title, searchQuery)}
          </h4>
          <WishlistButton gameId={game.id} title={game.title} />
        </div>

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
