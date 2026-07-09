import { useMemo } from 'react';
import { Sparkles, Timer, ChevronDown } from 'lucide-react';
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
        <section aria-labelledby="xbox-new-title">
          <h2
            id="xbox-new-title"
            className={`section-title${canCollapse ? ' section-title--toggle' : ''}`}
            onClick={canCollapse ? () => setCollapsedNew((c) => !c) : undefined}
            role={canCollapse ? 'button' : undefined}
            tabIndex={canCollapse ? 0 : undefined}
            onKeyDown={canCollapse ? (e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsedNew((c) => !c); } : undefined}
            aria-expanded={canCollapse ? !collapsedNew : undefined}
          >
            <Sparkles size={22} className="icon-xbox" aria-hidden="true" />
            {newAdditions.length > 0
              ? t.xbox.newTitleCount.replace('{count}', String(newAdditions.length))
              : t.xbox.newTitle}
            {canCollapse && <ChevronDown size={20} className={`section-chevron${collapsedNew ? ' collapsed' : ''}`} aria-hidden="true" />}
          </h2>

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
        </section>
      )}

      {(activeFilter === 'all' || activeFilter === 'xbox_discount') && (
        <section aria-labelledby="xbox-discount-title">
          <h2
            id="xbox-discount-title"
            className={`section-title${canCollapse ? ' section-title--toggle' : ''}`}
            onClick={canCollapse ? () => setCollapsedDiscount((c) => !c) : undefined}
            role={canCollapse ? 'button' : undefined}
            tabIndex={canCollapse ? 0 : undefined}
            onKeyDown={canCollapse ? (e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsedDiscount((c) => !c); } : undefined}
            aria-expanded={canCollapse ? !collapsedDiscount : undefined}
          >
            <Timer size={22} className="icon-xbox" aria-hidden="true" />
            {t.xbox.discountTitle}
            {canCollapse && <ChevronDown size={20} className={`section-chevron${collapsedDiscount ? ' collapsed' : ''}`} aria-hidden="true" />}
          </h2>

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
        </section>
      )}

      {activeFilter === 'all' && games.length === 0 && searchQuery && (
        <SearchEmptyState searchQuery={searchQuery} />
      )}
    </>
  );
}
