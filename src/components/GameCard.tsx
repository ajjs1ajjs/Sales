import { useState, type ReactElement } from 'react';
import { ExternalLink, Tag, TrendingUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
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
  const escaped = escapeRegExp(highlight);
  const regex = new RegExp(escaped, 'gi');
  const parts = text.split(regex);
  const result: ReactElement[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    result.push(<span key={`t-${lastIndex}`}>{parts[lastIndex]}</span>);
    result.push(<mark key={`m-${match.index}`} className="highlighted-text">{match[0]}</mark>);
    lastIndex++;
  }
  result.push(<span key={`t-${lastIndex}`}>{parts[lastIndex]}</span>);
  return <>{result}</>;
}

export function GameCard({
  game,
  platform,
  badge,
  badgeVariant,
  showTagDescription,
  showTrendingDescription,
  isUpcoming,
  linkText,
  searchQuery = '',
}: Props) {
  const { t } = useLocale();
  const [imgError, setImgError] = useState(false);
  const defaultLinkText = linkText ?? t.steam.buy;

  return (
    <article
      className={`game-card${isUpcoming ? ' game-card--upcoming' : ''}`}
      aria-label={t.platform.gameAria.replace('{title}', game.title).replace('{platform}', platform === 'epic' ? t.platform.epic : t.platform.steam)}
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
              ? t.epic.discountTag
              : t.steam.specialsTag}
          </p>
        )}

        {showTrendingDescription && (
          <p className="card-desc card-desc--with-icon">
            <TrendingUp size={14} aria-hidden="true" /> {t.steam.trendingDesc}
          </p>
        )}

        {isUpcoming && (
          <p className="card-desc">
            <span className="upcoming-status">
              {t.date.from.replace('{date}', formatDate((game as EpicGame).startDate))}
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
              <span className="price-current free-text">{t.price.free}</span>
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
            aria-label={`${defaultLinkText} ${game.title}`}
          >
            {defaultLinkText} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
