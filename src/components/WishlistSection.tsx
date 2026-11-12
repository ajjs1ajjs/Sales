import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useLocale } from '../contexts/LocaleContext';
import type { GamePassGame, SortType, SteamGame, PriceObservation } from '../types';
import { sortGames, sortGamePassGames, safeUrl } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { CollapsibleSection } from './CollapsibleSection';
import { PriceTracking } from './PriceTracking';

interface Props {
  steam: SteamGame[];
  gamepass: GamePassGame[];
  searchQuery: string;
  sortType: SortType;
  missingIds: string[];
  priceHistory?: Record<string, PriceObservation[]>;
}

/**
 * Плоский список обраного (Steam + Game Pass). Раніше обране Steam малювалось
 * трьома секціями (free/specials/popular), і гра зі списку бажань, яка не
 * потрапляла в жодну секцію, не відображалась взагалі.
 */
export function WishlistSection({ steam, gamepass, searchQuery, sortType, missingIds, priceHistory = {} }: Props) {
  const { t } = useLocale();
  const { wishlist, saved, targets, toggleWishlist, importWishlist } = useWishlist();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
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
  const steamSorted = useMemo(() => sortGames(steam, sortType), [steam, sortType]);
  const gamepassSorted = useMemo(() => sortGamePassGames(gamepass, sortType), [gamepass, sortType]);

  const items = useMemo(
    () => [
      ...steamSorted.map((deal) => (
        <GameCard
          key={`s-${deal.id}`}
          game={deal}
          platform="steam"
          badge={deal.isFree ? 'FREE' : deal.discountPercent > 0 ? `-${deal.discountPercent}%` : undefined}
          badgeVariant={deal.isFree ? 'free' : undefined}
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
    ],
    [steamSorted, gamepassSorted, searchQuery, t.gamepass.badgeNew, t.gamepass.badgeTop, priceHistory, targets],
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
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        {message && <span role="status">{message}</span>}
      </div>
      {wishlist.length === 0 && <p>{t.app.wishlistEmptyDesc}</p>}
      <div className="deals-grid section-gap-bottom">
        <ShowMore items={items} />
        {missingIds.map(id => {
          const item = saved[id];
          const title = item?.game.title ?? id;
          const url = item ? safeUrl(item.game.url) : '';
          const imageUrl = item ? safeUrl(item.game.imageUrl) : '';
          return <article className="game-card" key={`missing-${id}`}>
            {imageUrl && <img className="card-image" src={imageUrl} alt="" loading="lazy" />}
            <div className="card-content">
              <div className="card-title-row"><h4 className="card-title">{title}</h4>
                <button type="button" className="wishlist-btn wishlist-btn--active" onClick={() => toggleWishlist(id)} aria-label={t.wishlist.remove.replace('{title}', () => title)}><Heart size={16} fill="currentColor" aria-hidden="true" /></button>
              </div>
              <p className="card-desc">{t.wishlist.unavailable}</p>
              {url && <a href={url} target="_blank" rel="noopener noreferrer" className="store-link">{t.wishlist.openStore}</a>}
              {item?.platform === 'steam' && 'currency' in item.game && typeof item.game.currency === 'string' && /^[A-Z]{3}$/.test(item.game.currency) && <PriceTracking key={`${id}-${targets[id]?.amount}-${targets[id]?.currency}`} id={id} title={title} currency={item.game.currency} observations={priceHistory[id] ?? []} />}
            </div>
          </article>;
        })}
      </div>
    </CollapsibleSection>
  );
}
