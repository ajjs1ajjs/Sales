import { useMemo } from 'react';
import { Gift, Tag } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { EpicGame, FilterType, SortType } from '../types';
import { sortGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { SearchEmptyState } from './SearchEmptyState';

interface Props {
  games: EpicGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
}

export function EpicSection({ games, activeFilter, searchQuery, sortType }: Props) {
  const { t } = useLocale();
  const [collapsedFree, setCollapsedFree] = useLocalStorage('collapse-epic-free', false);
  const [collapsedDiscount, setCollapsedDiscount] = useLocalStorage('collapse-epic-discount', false);
  const sorted = useMemo(() => sortGames(games, sortType), [games, sortType]);

  const toggleFree = () => setCollapsedFree((c) => !c);
  const toggleDiscount = () => setCollapsedDiscount((c) => !c);

  const currentFree = sorted.filter((g) => g.isFreeNow);
  const upcomingFree = sorted.filter((g) => g.isUpcomingFree);
  const discounted = sorted.filter((g) => g.isDiscounted);

  const canCollapse = activeFilter === 'all';

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'epic_free') && (
        <CollapsibleSection
          id="epic-free-title"
          title={t.epic.freeTitle}
          icon={<Gift size={22} className="icon-epic" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedFree}
          onToggle={toggleFree}
        >
          {currentFree.length === 0 && upcomingFree.length === 0 && (
            <div className="empty-state section-gap-bottom">
              <h3>{t.epic.emptyFree}</h3>
              <p>{t.epic.emptyFreeDesc}</p>
            </div>
          )}

          {currentFree.length > 0 && (
            <div className="subsection">
              <h3 className="subsection-title">
                <span className="dot dot--green" aria-hidden="true" />
                {t.epic.freeSubtitle.replace('{count}', String(currentFree.length))}
              </h3>
              <div className="deals-grid">
                <ShowMore
                  items={currentFree.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      platform="epic"
                      badge="FREE"
                      badgeVariant="free"
                      linkText={t.epic.getFree}
                      searchQuery={searchQuery}
                    />
                  ))}
                />
              </div>
            </div>
          )}

          {upcomingFree.length > 0 && (
            <div className="subsection">
              <h3 className="subsection-title">
                <span className="dot dot--purple" aria-hidden="true" />
                {t.epic.upcomingSubtitle.replace('{count}', String(upcomingFree.length))}
              </h3>
              <div className="deals-grid">
                <ShowMore
                  items={upcomingFree.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      platform="epic"
                      isUpcoming
                      upcomingStartDate={game.startDate}
                      linkText={t.epic.toStore}
                      searchQuery={searchQuery}
                    />
                  ))}
                />
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {(activeFilter === 'all' || activeFilter === 'epic_discount') && (
        <CollapsibleSection
          id="epic-discount-title"
          title={t.epic.discountTitle}
          icon={<Tag size={22} className="icon-epic" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedDiscount}
          onToggle={toggleDiscount}
        >
          {discounted.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.epic.emptyDiscount}</h3>
              <p>{t.epic.emptyDiscountDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                items={discounted.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    platform="epic"
                    badge={game.discountPercent > 0 ? `-${game.discountPercent}%` : undefined}
                    badgeVariant={game.discountPercent > 0 ? 'discount' : undefined}
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
