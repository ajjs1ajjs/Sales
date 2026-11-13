import { useMemo, useState, type ReactNode } from 'react';
import { ExternalLink, Tag, TrendingUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { GamePassGame, SteamGame } from '../types';
import { buildFallbackImage, buildHighlightRegex, formatPrice, formatDate, formatDateEn, safeUrl } from '../utils';
import { WishlistButton } from './WishlistButton';

export type Game = SteamGame;
export type AnyGame = SteamGame | GamePassGame;

interface BaseProps {
  platform: 'steam' | 'gamepass';
  badge?: string;
  badgeVariant?: 'free' | 'discount' | 'top';
  showTagDescription?: boolean;
  showTrendingDescription?: boolean;
  isUpcoming?: boolean;
  upcomingStartDate?: string;
  linkText?: string;
  searchQuery?: string;
  extra?: ReactNode;
}

type Props = BaseProps & { game: AnyGame };

export function HighlightText({ text, regex }: { text: string; regex: RegExp | null }) {
  if (!regex) return <span>{text}</span>;
  // Capturing-група в split() кладе збіги на непарні індекси — один прохід, без stateful exec.
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="highlighted-text">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
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
  upcomingStartDate,
  linkText,
  searchQuery = '',
  extra,
}: Props) {
  const { t, locale } = useLocale();
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imgError = failedImageUrl === game.imageUrl;
  const isGamePass = platform === 'gamepass';
  // platform і game приходять узгоджено від секцій; для гілки Steam даємо
  // TS-звуження, щоб не тягути in-перевірки на кожне поле.
  const steamGame = isGamePass ? null : (game as SteamGame);
  const platformName = isGamePass ? t.platform.gamepass : t.platform.steam;
  const defaultLinkText = linkText ?? (isGamePass ? t.gamepass.viewInStore : t.steam.buy);
  const isFreeOffer = steamGame?.isFree ?? false;

  const highlightRegex = useMemo(() => buildHighlightRegex(searchQuery), [searchQuery]);
  const fallbackImg = useMemo(() => buildFallbackImage(t.app.imageUnavailable), [t.app.imageUnavailable]);

  const safeImageUrl = useMemo(
    () => (imgError ? fallbackImg : (safeUrl(game.imageUrl) || fallbackImg)),
    [game.imageUrl, imgError, fallbackImg],
  );
  const safeStoreUrl = useMemo(() => safeUrl(game.url) || '#', [game.url]);

  return (
    <article
      className={`game-card${isUpcoming ? ' game-card--upcoming' : ''}`}
      aria-label={t.platform.gameAria.replace('{title}', game.title).replace('{platform}', platformName)}
    >
      <div className="card-image-wrapper">
        <span className={`platform-badge ${platform}`}>
          {platformName}
        </span>
        {badge && (
          <span className={`deal-badge${badgeVariant ? ` ${badgeVariant}` : ''}`}>
            {badge}
          </span>
        )}
        <img
          src={safeImageUrl}
          alt={game.title}
          className="card-image"
          loading="lazy"
          decoding="async"
          onError={() => setFailedImageUrl(game.imageUrl)}
        />
      </div>
      <div className="card-content">
        <div className="card-title-row">
          <h4 className="card-title" title={game.title}>
            <HighlightText text={game.title} regex={highlightRegex} />
          </h4>
          <WishlistButton gameId={game.id} title={game.title} />
        </div>

        {showTagDescription && (
          <p className="card-desc card-desc--with-icon">
            <Tag size={14} aria-hidden="true" />{' '}
            {t.steam.specialsTag}
          </p>
        )}

        {showTrendingDescription && (
          <p className="card-desc card-desc--with-icon">
            <TrendingUp size={14} aria-hidden="true" /> {t.steam.trendingDesc}
          </p>
        )}

        {isUpcoming && upcomingStartDate && (
          <p className="card-desc">
            <span className="upcoming-status">
              {t.date.from.replace(
                '{date}',
                locale === 'en' ? formatDateEn(upcomingStartDate) : formatDate(upcomingStartDate),
              )}
            </span>
          </p>
        )}

        <div className="card-footer">
          <div className="price-container">
            {steamGame && steamGame.originalPrice > 0 && (
              <span className="price-original">
                {formatPrice(steamGame.originalPrice, steamGame.currency, locale)}
              </span>
            )}
            {isGamePass ? (
              <span className="price-current gp-included">{t.gamepass.included}</span>
            ) : isFreeOffer ? (
              <span className="price-current free-text">{t.price.free}</span>
            ) : steamGame ? (
              <span className="price-current">
                {formatPrice(steamGame.discountPrice, steamGame.currency, locale)}
              </span>
            ) : null}
          </div>
          <a
            href={safeStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="store-link"
            aria-label={`${defaultLinkText} ${game.title}`}
          >
            {defaultLinkText} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
        {extra}
      </div>
    </article>
  );
}
