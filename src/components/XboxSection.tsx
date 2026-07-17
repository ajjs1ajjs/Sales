import { useMemo } from 'react';
import { Sparkles, Timer } from 'lucide-react';
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
  const [collapsedDiscount, setCollapsedDiscount] = useLocalStorage('collapse-xbox-discount', false);
  const sorted = useMemo(() => sortGames(games, sortType), [games, sortType]);

  const newAdditions = sorted.filter((g) => g.isNewToGamePass);
  const comingSoon = sorted.filter((g) => g.isComingSoon);
  const discounted = sorted.filter((g) => g.isDiscounted);

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
              {newAdditions.length === 0 && comingSoon.length === 0 && (
                <div className="empty-state section-gap-bottom">
                  <h3>{t.xbox.emptyNew}</h3>
                  <p>{t.xbox.emptyNewDesc}</p>
                </div>
              )}

              {newAdditions.length > 0 && (
                <div className="subsection">
                  <h3 className="subsection-title">
                    <span className="dot dot--green" aria-hidden="true" />
                    Now available
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

              {comingSoon.length > 0 && (
                <div className="subsection">
                  <h3 className="subsection-title">
                    <span className="dot dot--purple" aria-hidden="true" />
                    {comingSoon.length > 0
                      ? t.xbox.comingTitleCount.replace('{count}', String(comingSoon.length))
                      : t.xbox.comingTitle}
                  </h3>
                  <div className="deals-grid">
                    <ShowMore
                      items={comingSoon.map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          platform="xbox"
                          isUpcoming
                          linkText={t.xbox.toStore}
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

      {(activeFilter === 'all' || activeFilter === 'xbox_discount') && (
        <CollapsibleSection
          id="xbox-discount-title"
          title={t.xbox.discountTitle}
          icon={<Timer size={22} className="icon-xbox" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedDiscount}
          onToggle={() => setCollapsedDiscount((c) => !c)}
        >
          {(!canCollapse || !collapsedDiscount) && (
            <>
              {discounted.length === 0 ? (
                <div className="empty-state section-gap-bottom">
                  <h3>{t.xbox.emptyGamePass}</h3>
                  <p>{t.xbox.emptyGamePassDesc}</p>
                </div>
              ) : (
                <div className="deals-grid section-gap-bottom">
                  <ShowMore
                    items={discounted.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        platform="xbox"
                        badge={game.discountPercent > 0 ? `-${game.discountPercent}%` : undefined}
                        badgeVariant={game.discountPercent > 0 ? 'discount' : undefined}
                        showTagDescription
                        searchQuery={searchQuery}
                      />
                    ))}
                  />
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
