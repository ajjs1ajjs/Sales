import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ExternalLink, Heart } from 'lucide-react';
import { useWishlist, type PriceTarget, type SavedGame } from '../contexts/WishlistContext';
import { useLocale } from '../contexts/LocaleContext';
import type { GamePassGame, PlayStationGame, SortType, SteamGame, PriceObservation } from '../types';
import { buildFallbackImage, buildHighlightRegex, isPriceTrackedId, sortGames, sortGamePassGames, sortPlayStationGames, safeUrl } from '../utils';
import { GameCard, HighlightText } from './GameCard';
import { ShowMore } from './ShowMore';
import { CollapsibleSection } from './CollapsibleSection';
import { PriceTracking } from './PriceTracking';
import { WishlistButton } from './WishlistButton';

interface Props {
  steam: SteamGame[];
  gamepass: GamePassGame[];
  playstation?: PlayStationGame[];
  searchQuery: string;
  sortType: SortType;
  missingIds: string[];
  priceHistory?: Record<string, PriceObservation[]>;
}

function MissingWishlistCard({
  id,
  item,
  searchQuery,
  target,
  observations,
}: {
  id: string;
  item?: SavedGame;
  searchQuery: string;
  target?: PriceTarget;
  observations: PriceObservation[];
}) {
  const { t } = useLocale();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const title = item?.game.title ?? id;
  const url = item ? safeUrl(item.game.url) : '';
  const rawImageUrl = item ? safeUrl(item.game.imageUrl) : '';
  const fallbackImg = useMemo(() => buildFallbackImage(t.app.imageUnavailable), [t.app.imageUnavailable]);
  const imageSrc = !rawImageUrl || failedUrl === rawImageUrl ? fallbackImg : rawImageUrl;
  const inferredPlatform = /^\d+$/.test(id)
    ? 'steam'
    : id.startsWith('ps_') || /^[A-Z]{2}\d{4}-/.test(id)
      ? 'playstation'
      : 'gamepass';
  const platform = item?.platform ?? inferredPlatform;
  const platformName =
    platform === 'gamepass'
      ? t.platform.gamepass
      : platform === 'playstation'
        ? t.platform.playstation
        : t.platform.steam;
  const highlightRegex = useMemo(() => buildHighlightRegex(searchQuery), [searchQuery]);
  const snapshotCurrency =
    item && 'currency' in item.game && typeof item.game.currency === 'string' && /^[A-Z]{3}$/.test(item.game.currency)
      ? item.game.currency
      : undefined;

  return (
    <article
      className="game-card"
      aria-label={t.platform.gameAria.replace('{title}', title).replace('{platform}', platformName)}
    >
      <div className="card-image-wrapper">
        <span className={`platform-badge ${platform}`}>{platformName}</span>
        <img
          className="card-image"
          src={imageSrc}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => { if (rawImageUrl) setFailedUrl(rawImageUrl); }}
        />
      </div>
      <div className="card-content">
        <div className="card-title-row">
          <h4 className="card-title" title={title}>
            <HighlightText text={title} regex={highlightRegex} />
          </h4>
          <WishlistButton gameId={id} title={title} />
        </div>
        <p className="card-desc">{t.wishlist.unavailable}</p>
        {url && (
          <div className="card-footer">
            <a href={url} target="_blank" rel="noopener noreferrer" className="store-link">
              {t.wishlist.openStore} <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        )}
        {snapshotCurrency && isPriceTrackedId(id) && (
          <PriceTracking
            key={`${id}-${target?.amount}-${target?.currency}`}
            id={id}
            title={title}
            currency={snapshotCurrency}
            observations={observations}
          />
        )}
      </div>
    </article>
  );
}

function matchesPriceTarget(
  deal: { id: string; currency?: string; discountPrice?: number },
  targets: Record<string, PriceTarget>,
): boolean {
  const target = targets[deal.id];
  return (
    !!target &&
    !!deal.currency &&
    typeof deal.discountPrice === 'number' &&
    target.currency === deal.currency &&
    deal.discountPrice <= target.amount
  );
}

/**
 * Плоский список обраного (Steam + Game Pass + PlayStation 5).
 */
export function WishlistSection({
  steam,
  gamepass,
  playstation = [],
  searchQuery,
  sortType,
  missingIds,
  priceHistory = {},
}: Props) {
  const { t } = useLocale();
  const { wishlist, saved, targets, importWishlist } = useWishlist();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [targetMetOnly, setTargetMetOnly] = useState(false);

  const exportList = () => {
    const snapshots = Object.fromEntries(wishlist.filter(id => saved[id]).map(id => [id, saved[id]]));
    const exportedTargets = Object.fromEntries(wishlist.filter(id => targets[id]).map(id => [id, targets[id]]));
    const blob = new Blob([JSON.stringify({ version: 1, ids: wishlist, saved: snapshots, targets: exportedTargets }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales-wishlist.json';
    link.click();
    URL.revokeObjectURL(url);
  };
  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error();
      setMessage(importWishlist(JSON.parse(await file.text())) ? t.wishlist.importSuccess : t.wishlist.importError);
    } catch { setMessage(t.wishlist.importError); }
  };

  const targetMetCount =
    steam.filter((deal) => matchesPriceTarget(deal, targets)).length +
    playstation.filter((deal) => matchesPriceTarget(deal, targets)).length;

  const steamSorted = useMemo(() => {
    const base = targetMetOnly ? steam.filter((deal) => matchesPriceTarget(deal, targets)) : steam;
    return sortGames(base, sortType);
  }, [steam, sortType, targetMetOnly, targets]);
  const gamepassSorted = useMemo(
    () => (targetMetOnly ? [] : sortGamePassGames(gamepass, sortType)),
    [gamepass, sortType, targetMetOnly],
  );
  const psSorted = useMemo(() => {
    const base = targetMetOnly ? playstation.filter((deal) => matchesPriceTarget(deal, targets)) : playstation;
    return sortPlayStationGames(base, sortType);
  }, [playstation, sortType, targetMetOnly, targets]);

  const items = useMemo(
    () => [
      ...steamSorted.map((deal) => (
        <GameCard
          key={`s-${deal.id}`}
          game={deal}
          platform="steam"
          badge={deal.isFree ? 'FREE' : deal.discountPercent > 0 ? `-${deal.discountPercent}%` : undefined}
          badgeVariant={deal.isFree ? 'free' : deal.isDlc ? 'dlc' : undefined}
          searchQuery={searchQuery}
          extra={<PriceTracking key={`${deal.id}-${targets[deal.id]?.amount}-${targets[deal.id]?.currency}`} id={deal.id} title={deal.title} currency={deal.currency} currentPrice={deal.discountPrice} observations={priceHistory[deal.id] ?? []} />}
        />
      )),
      ...gamepassSorted.map((deal) => (
        <GameCard
          key={`g-${deal.id}`}
          game={deal}
          platform="gamepass"
          badge={deal.isNew ? t.gamepass.badgeNew : deal.isPopular ? t.gamepass.badgeTop : undefined}
          badgeVariant={deal.isNew ? undefined : deal.isPopular ? 'top' : undefined}
          searchQuery={searchQuery}
        />
      )),
      ...psSorted.map((deal) => {
        const badge = deal.psPlusTier === 'essential'
          ? t.playstation.badgeMonthly
          : deal.psPlusTier === 'extra'
            ? t.playstation.badgeExtra
            : deal.discountPercent
              ? `-${deal.discountPercent}%`
              : deal.isPopular
                ? t.playstation.badgeTop
                : undefined;
        const badgeVariant = deal.psPlusTier === 'essential'
          ? 'free'
          : deal.psPlusTier === 'extra' || (!deal.discountPercent && deal.isPopular)
            ? 'ps'
            : undefined;
        return (
          <GameCard
            key={`ps-${deal.id}`}
            game={deal}
            platform="playstation"
            badge={badge}
            badgeVariant={badgeVariant}
            searchQuery={searchQuery}
            extra={
              typeof deal.discountPrice === 'number' && deal.currency && isPriceTrackedId(deal.id) ? (
                <PriceTracking
                  key={`${deal.id}-${targets[deal.id]?.amount}-${targets[deal.id]?.currency}`}
                  id={deal.id}
                  title={deal.title}
                  currency={deal.currency}
                  currentPrice={deal.discountPrice}
                  observations={priceHistory[deal.id] ?? []}
                />
              ) : undefined
            }
          />
        );
      }),
      ...(targetMetOnly ? [] : missingIds).map((id) => (
        <MissingWishlistCard
          key={`missing-${id}`}
          id={id}
          item={saved[id]}
          searchQuery={searchQuery}
          target={targets[id]}
          observations={priceHistory[id] ?? []}
        />
      )),
    ],
    [
      steamSorted,
      gamepassSorted,
      psSorted,
      missingIds,
      saved,
      searchQuery,
      t.gamepass.badgeNew,
      t.gamepass.badgeTop,
      t.playstation.badgeMonthly,
      t.playstation.badgeExtra,
      t.playstation.badgeTop,
      priceHistory,
      targets,
      targetMetOnly,
    ],
  );

  return (
    <CollapsibleSection
      id="wishlist-title"
      title={t.filters.wishlist}
      icon={<Heart size={22} className="icon-wishlist" aria-hidden="true" />}
      canCollapse={false}
      collapsed={false}
      onToggle={() => {}}
    >
      <div className="wishlist-actions">
        <button type="button" className="filter-btn" onClick={exportList}>{t.wishlist.export}</button>
        <button type="button" className="filter-btn" onClick={() => fileRef.current?.click()}>{t.wishlist.import}</button>
        {(targetMetCount > 0 || targetMetOnly) && (
          <button
            type="button"
            className={`filter-btn${targetMetOnly ? ' active' : ''}`}
            aria-pressed={targetMetOnly}
            onClick={() => setTargetMetOnly((v) => !v)}
          >
            {t.wishlist.targetMetOnly} ({targetMetCount})
          </button>
        )}
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        {message && <span role="status">{message}</span>}
      </div>
      {wishlist.length === 0 && <p>{t.app.wishlistEmptyDesc}</p>}
      <div className="deals-grid section-gap-bottom">
        <ShowMore items={items} resetKey={`${searchQuery}|${sortType}|${targetMetOnly}`} />
      </div>
    </CollapsibleSection>
  );
}
