import { useMemo, useState, type ReactNode } from 'react';
import { ExternalLink, Layers, Tag, ThumbsUp, TrendingDown, TrendingUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { GamePassGame, PlayStationGame, SteamGame } from '../types';
import {
  buildFallbackImage,
  buildHighlightRegex,
  formatDate,
  formatDateEn,
  formatPrice,
  formatReviewCount,
  safeUrl,
} from '../utils';
import { WishlistButton } from './WishlistButton';

export type Game = SteamGame;
export type AnyGame = SteamGame | GamePassGame | PlayStationGame;

interface BaseProps {
  platform: 'steam' | 'gamepass' | 'playstation';
  badge?: string;
  badgeVariant?: 'free' | 'discount' | 'top' | 'ps' | 'dlc';
  showTagDescription?: boolean;
  showTrendingDescription?: boolean;
  customDescription?: string;
  isLowestPrice?: boolean;
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
  customDescription,
  isLowestPrice,
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
  const isPlayStation = platform === 'playstation';
  const steamGame = platform === 'steam' ? (game as SteamGame) : null;
  const psGame = isPlayStation ? (game as PlayStationGame) : null;
  const platformName = isGamePass
    ? t.platform.gamepass
    : isPlayStation
      ? t.platform.playstation
      : t.platform.steam;
  const defaultLinkText =
    linkText ??
    (isGamePass
      ? t.gamepass.viewInStore
      : isPlayStation
        ? psGame?.psPlusTier
          ? t.playstation.viewInStore
          : t.playstation.buy
        : t.steam.buy);
  const isFreeOffer = steamGame?.isFree ?? false;

  const highlightRegex = useMemo(() => buildHighlightRegex(searchQuery), [searchQuery]);
  const fallbackImg = useMemo(() => buildFallbackImage(t.app.imageUnavailable), [t.app.imageUnavailable]);

  const safeImageUrl = useMemo(
    () => (imgError ? fallbackImg : (safeUrl(game.imageUrl) || fallbackImg)),
    [game.imageUrl, imgError, fallbackImg],
  );
  const safeStoreUrl = useMemo(() => safeUrl(game.url) || '#', [game.url]);
  const descriptionText = customDescription ?? (psGame?.description || (isGamePass ? (game as GamePassGame).description : undefined));
  const hasMetaPills = Boolean(
    (steamGame?.reviewPercent !== undefined && steamGame?.reviewCount) ||
      steamGame?.isDlc ||
      isLowestPrice ||
      psGame?.isPsPlusExclusive ||
      psGame?.psPlusMonth,
  );

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

        {hasMetaPills && (
          <div className="card-meta-row">
            {steamGame?.isDlc && (
              <span className="meta-pill meta-pill--dlc">
                <Layers size={12} aria-hidden="true" />
                {t.steam.dlcBadge}
              </span>
            )}
            {steamGame?.reviewPercent !== undefined && steamGame?.reviewCount ? (
              <span
                className="meta-pill meta-pill--rating"
                aria-label={t.steam.reviewsAria
                  .replace('{percent}', String(steamGame.reviewPercent))
                  .replace('{count}', formatReviewCount(steamGame.reviewCount))}
              >
                <ThumbsUp size={12} aria-hidden="true" />
                {steamGame.reviewPercent}% · {formatReviewCount(steamGame.reviewCount)}
              </span>
            ) : null}
            {isLowestPrice && (
              <span className="meta-pill meta-pill--lowest">
                <TrendingDown size={12} aria-hidden="true" />
                {t.steam.lowestPrice}
              </span>
            )}
            {psGame?.isPsPlusExclusive && (
              <span className="meta-pill meta-pill--psplus">{t.playstation.psPlusExtraDiscount}</span>
            )}
            {psGame?.psPlusMonth && (
              <span className="meta-pill meta-pill--psplus">{psGame.psPlusMonth}</span>
            )}
          </div>
        )}

        {descriptionText && !showTagDescription && !showTrendingDescription && (
          <p className="card-desc">{descriptionText}</p>
        )}

        {showTagDescription && (
          <p className="card-desc card-desc--with-icon">
            <Tag size={14} aria-hidden="true" />{' '}
            {steamGame?.isDlc ? t.steam.dlcDesc : isPlayStation ? t.playstation.dealsTag : t.steam.specialsTag}
          </p>
        )}

        {showTrendingDescription && (
          <p className="card-desc card-desc--with-icon">
            <TrendingUp size={14} aria-hidden="true" /> {isPlayStation ? t.playstation.trendingDesc : t.steam.trendingDesc}
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
            {psGame &&
              typeof psGame.originalPrice === 'number' &&
              typeof psGame.discountPrice === 'number' &&
              psGame.originalPrice > psGame.discountPrice && (
                <span className="price-original">
                  {formatPrice(psGame.originalPrice, psGame.currency || 'UAH', locale)}
                </span>
              )}
            {isGamePass ? (
              <span className="price-current gp-included">{t.gamepass.included}</span>
            ) : psGame?.psPlusTier === 'essential' ? (
              <span className="price-current ps-included">{t.playstation.includedEssential}</span>
            ) : psGame?.psPlusTier === 'extra' ? (
              <span className="price-current ps-included">{t.playstation.includedExtra}</span>
            ) : isFreeOffer ? (
              <span className="price-current free-text">{t.price.free}</span>
            ) : steamGame ? (
              <span className="price-current">
                {formatPrice(steamGame.discountPrice, steamGame.currency, locale)}
              </span>
            ) : psGame && typeof psGame.discountPrice === 'number' ? (
              <span className="price-current">
                {psGame.discountPrice === 0
                  ? t.price.free
                  : formatPrice(psGame.discountPrice, psGame.currency || 'UAH', locale)}
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
