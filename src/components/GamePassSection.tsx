import { useMemo } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { GamePassGame, FilterType, SortType } from '../types';
import { sortGamePassGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  games: GamePassGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
}

export function GamePassSection({ games, activeFilter, searchQuery, sortType }: Props) {
  const { t } = useLocale();
  const [collapsedNew, setCollapsedNew] = useLocalStorage('collapse-gamepass-new', false);
  const [collapsedPopular, setCollapsedPopular] = useLocalStorage('collapse-gamepass-popular', false);
  const sorted = useMemo(() => sortGamePassGames(games, sortType), [games, sortType]);

  const newGames = sorted.filter((g) => g.isNew);
  const popular = sorted.filter((g) => g.isPopular);

  const canCollapse = activeFilter === 'all';

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'gamepass_new') && (
        <CollapsibleSection
          id="gamepass-new-title"
          title={t.gamepass.newTitle}
          icon={<Sparkles size={22} className="icon-gamepass" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedNew}
          onToggle={() => setCollapsedNew((c) => !c)}
        >
          {newGames.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.gamepass.emptyNew}</h3>
              <p>{t.gamepass.emptyNewDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                items={newGames.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="gamepass"
                    badge={t.gamepass.badgeNew}
                    searchQuery={searchQuery}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {(activeFilter === 'all' || activeFilter === 'gamepass_popular') && (
        <CollapsibleSection
          id="gamepass-popular-title"
          title={t.gamepass.popularTitle}
          icon={<TrendingUp size={22} className="icon-gamepass" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedPopular}
          onToggle={() => setCollapsedPopular((c) => !c)}
        >
          {popular.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.gamepass.emptyPopular}</h3>
              <p>{t.gamepass.emptyPopularDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                items={popular.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="gamepass"
                    badge={t.gamepass.badgeTop}
                    badgeVariant="top"
                    searchQuery={searchQuery}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}
    </>
  );
}
