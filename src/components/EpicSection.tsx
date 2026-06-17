import { useMemo } from 'react';
import { Gift, Tag, Gamepad2 } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { EpicGame, FilterType, SortType } from '../types';
import { sortGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';

interface Props {
  games: EpicGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
}

export function EpicSection({ games, activeFilter, searchQuery, sortType }: Props) {
  const { t } = useLocale();
  const sorted = useMemo(() => sortGames(games, sortType), [games, sortType]);

  const currentFree = sorted.filter((g) => g.isFreeNow);
  const upcomingFree = sorted.filter((g) => g.isUpcomingFree);
  const discounted = sorted.filter((g) => g.isDiscounted);

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'epic_free') && (
        <section aria-labelledby="epic-free-title">
          <h2 id="epic-free-title" className="section-title">
            <Gift size={22} className="icon-epic" aria-hidden="true" />
            {t.epic.freeTitle}
          </h2>

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
        </section>
      )}

      {(activeFilter === 'all' || activeFilter === 'epic_discount') && (
        <section aria-labelledby="epic-discount-title">
          <h2 id="epic-discount-title" className="section-title">
            <Tag size={22} className="icon-epic" aria-hidden="true" />
            {t.epic.discountTitle}
          </h2>

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
        </section>
      )}

      {activeFilter === 'all' && games.length === 0 && searchQuery && (
        <div className="empty-state section-gap-top">
          <Gamepad2 size={48} className="icon-muted" aria-hidden="true" />
          <h3>{t.app.notFoundTitle.replace('{query}', searchQuery)}</h3>
          <p>{t.app.notFoundDesc}</p>
        </div>
      )}
    </>
  );
}
