import { useMemo } from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { SteamGame, FilterType, SortType } from '../types';
import { sortGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { SearchEmptyState } from './SearchEmptyState';

interface Props {
  games: SteamGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
  nonGameIds?: Set<string>;
}

export function SteamSection({ games, activeFilter, searchQuery, sortType, nonGameIds }: Props) {
  const { t } = useLocale();
  const sorted = useMemo(() => sortGames(games, sortType), [games, sortType]);

  const specials = sorted.filter((g) => g.isSpecial);
  const popular = sorted.filter((g) => {
    if (!g.isPopular) return false;
    if (nonGameIds?.has(g.id)) return false;
    return true;
  });

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'steam_specials') && (
        <section aria-labelledby="steam-specials-title">
          <h2 id="steam-specials-title" className="section-title">
            <Flame size={22} className="icon-steam" aria-hidden="true" />
            {t.steam.specialsTitle}
          </h2>

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
        </section>
      )}

      {(activeFilter === 'all' || activeFilter === 'steam_popular') && (
        <section aria-labelledby="steam-popular-title">
          <h2 id="steam-popular-title" className="section-title">
            <TrendingUp size={22} className="icon-epic" aria-hidden="true" />
            {t.steam.popularTitle}
          </h2>

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
        </section>
      )}

      {activeFilter === 'all' && games.length === 0 && searchQuery && (
        <SearchEmptyState searchQuery={searchQuery} />
      )}
    </>
  );
}
