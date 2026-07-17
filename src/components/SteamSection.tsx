import { useMemo } from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SteamGame, FilterType, SortType } from '../types';
import { sortGames, isSteamNonGame } from '../utils';
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
  const [collapsedSpecials, setCollapsedSpecials] = useLocalStorage('collapse-steam-specials', false);
  const [collapsedPopular, setCollapsedPopular] = useLocalStorage('collapse-steam-popular', false);
  const sorted = useMemo(() => sortGames(games, sortType), [games, sortType]);
  const nonGameIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of games) {
      if (isSteamNonGame(g.imageUrl)) ids.add(g.id);
    }
    return ids;
  }, [games]);

  const specials = sorted.filter((g) => g.isSpecial);
  const popular = sorted.filter((g) => {
    if (!g.isPopular) return false;
    if (nonGameIds.has(g.id)) return false;
    return true;
  });

  const canCollapse = activeFilter === 'all';

  return (
    <>
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

      {(activeFilter === 'all' || activeFilter === 'steam_popular') && (
        <CollapsibleSection
          id="steam-popular-title"
          title={t.steam.popularTitle}
          icon={<TrendingUp size={22} className="icon-steam" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedPopular}
          onToggle={() => setCollapsedPopular((c) => !c)}
        >
          {popular.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.steam.emptyPopular}</h3>
              <p>{t.steam.emptyPopularDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                items={popular.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="steam"
                    badge={deal.discountPercent > 0 ? `-${deal.discountPercent}%` : undefined}
                    showTrendingDescription
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
