import { useMemo } from 'react';
import { Flame, Gift } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SteamGame, FilterType, SortType } from '../types';
import { sortGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { SearchEmptyState } from './SearchEmptyState';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  games: SteamGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
}

export function SteamSection({ games, activeFilter, searchQuery, sortType }: Props) {
  const { t } = useLocale();
  const [collapsedFree, setCollapsedFree] = useLocalStorage('collapse-steam-free', false);
  const [collapsedSpecials, setCollapsedSpecials] = useLocalStorage('collapse-steam-specials', false);
  const sorted = useMemo(() => sortGames(games, sortType), [games, sortType]);

  const free = sorted.filter((g) => g.isFree);
  const specials = sorted.filter((g) => g.isSpecial && !g.isFree);

  const canCollapse = activeFilter === 'all';

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'steam_free') && (
        <CollapsibleSection
          id="steam-free-title"
          title={t.steam.freeTitle}
          icon={<Gift size={22} className="icon-steam" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedFree}
          onToggle={() => setCollapsedFree((c) => !c)}
        >
          {free.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.steam.emptyFree}</h3>
              <p>{t.steam.emptyFreeDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                items={free.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="steam"
                    badge="FREE"
                    badgeVariant="free"
                    searchQuery={searchQuery}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {(activeFilter === 'all' || activeFilter === 'steam_specials') && (
        <CollapsibleSection
          id="steam-specials-title"
          title={t.steam.specialsTitle}
          icon={<Flame size={22} className="icon-steam" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedSpecials}
          onToggle={() => setCollapsedSpecials((c) => !c)}
        >
          {specials.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.steam.emptySpecials}</h3>
              <p>{t.steam.emptySpecialsDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                items={specials.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="steam"
                    badge={deal.discountPercent > 0 ? `-${deal.discountPercent}%` : undefined}
                    showTagDescription
                    searchQuery={searchQuery}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {activeFilter === 'all' && games.length === 0 && searchQuery && (
        <SearchEmptyState searchQuery={searchQuery} />
      )}
    </>
  );
}
