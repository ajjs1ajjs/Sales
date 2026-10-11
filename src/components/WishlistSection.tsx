import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { GamePassGame, SortType, SteamGame } from '../types';
import { sortGames, sortGamePassGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  steam: SteamGame[];
  gamepass: GamePassGame[];
  searchQuery: string;
  sortType: SortType;
}

/**
 * Плоский список обраного (Steam + Game Pass). Раніше обране Steam малювалось
 * трьома секціями (free/specials/popular), і гра зі списку бажань, яка не
 * потрапляла в жодну секцію, не відображалась взагалі.
 */
export function WishlistSection({ steam, gamepass, searchQuery, sortType }: Props) {
  const { t } = useLocale();
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
    [steamSorted, gamepassSorted, searchQuery, t.gamepass.badgeNew, t.gamepass.badgeTop],
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
      <div className="deals-grid section-gap-bottom">
        <ShowMore items={items} />
      </div>
    </CollapsibleSection>
  );
}
