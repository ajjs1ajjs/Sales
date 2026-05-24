import { Gift, Tag, Gamepad2 } from 'lucide-react';
import type { EpicGame, FilterType } from '../types';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';

interface Props {
  games: EpicGame[];
  activeFilter: FilterType;
  searchQuery: string;
}

export function EpicSection({ games, activeFilter, searchQuery }: Props) {
  const currentFree = games.filter((g) => g.isFreeNow);
  const upcomingFree = games.filter((g) => g.isUpcomingFree);
  const discounted = games.filter((g) => g.isDiscounted);

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'epic_free') && (
        <section aria-labelledby="epic-free-title">
          <h2 id="epic-free-title" className="section-title">
            <Gift size={22} className="icon-epic" aria-hidden="true" />
            Роздачі Epic Games Store
          </h2>

          {currentFree.length === 0 && upcomingFree.length === 0 && (
            <div className="empty-state section-gap-bottom">
              <h3>Нічого не знайдено</h3>
              <p>
                Наразі немає активних роздач або акцій, що відповідають вашому
                запиту.
              </p>
            </div>
          )}

          {currentFree.length > 0 && (
            <div className="subsection">
              <h3 className="subsection-title">
                <span className="dot dot--green" aria-hidden="true" />
                Безкоштовно зараз
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
                      linkText="Забрати"
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
                Незабаром у роздачі
              </h3>
              <div className="deals-grid">
                <ShowMore
                  items={upcomingFree.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      platform="epic"
                      isUpcoming
                      linkText="До магазину"
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
            Знижки Epic Games Store
          </h2>

          {discounted.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>Нічого не знайдено</h3>
              <p>
                Наразі немає активних знижок в Epic Games Store, що
                відповідають вашому запиту.
              </p>
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
          <h3>За запитом &ldquo;{searchQuery}&rdquo; ігор не знайдено</h3>
          <p>Спробуйте змінити пошуковий запит або скинути фільтри.</p>
        </div>
      )}
    </>
  );
}
