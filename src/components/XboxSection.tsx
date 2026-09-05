import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { XboxGame, FilterType, SortType } from '../types';
import { sortGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { SearchEmptyState } from './SearchEmptyState';

interface Props {
  games: XboxGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
}

export function XboxSection({ games, activeFilter, searchQuery, sortType }: Props) {
  const { t } = useLocale();
  const [collapsedNew, setCollapsedNew] = useLocalStorage('collapse-xbox-new', false);
  const sorted = useMemo(() => sortGames(games, sortType), [games, sortType]);

  const newAdditions = sorted.filter((g) => g.isNewToGamePass);

  const canCollapse = activeFilter === 'all';

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'xbox_new') && (
        <CollapsibleSection
          id="xbox-new-title"
          title={newAdditions.length > 0
            ? t.xbox.newTitleCount.replace('{count}', String(newAdditions.length))
            : t.xbox.newTitle}
          icon={<Sparkles size={22} className="icon-xbox" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedNew}
          onToggle={() => setCollapsedNew((c) => !c)}
        >
          {(!canCollapse || !collapsedNew) && (
            <>
              {newAdditions.length === 0 && (
                <div className="empty-state section-gap-bottom">
                  <h3>{t.xbox.emptyNew}</h3>
                  <p>{t.xbox.emptyNewDesc}</p>
                </div>
              )}

              {newAdditions.length > 0 && (
                <div className="subsection">
                  <h3 className="subsection-title">
                    <span className="dot dot--green" aria-hidden="true" />
                    {t.xbox.nowAvailable}
                  </h3>
                  <div className="deals-grid">
                    <ShowMore
                      items={newAdditions.map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          platform="xbox"
                          badge="NEW"
                          badgeVariant="free"
                          linkText={t.xbox.play}
                          searchQuery={searchQuery}
                        />
                      ))}
                    />
                  </div>
                </div>
              )}

            </>
          )}
        </CollapsibleSection>
      )}

      {activeFilter === 'all' && games.length === 0 && searchQuery && (
        <SearchEmptyState searchQuery={searchQuery} />
      )}
    </>
  );
}
