import { Flame, TrendingUp, Gamepad2 } from 'lucide-react';
import type { SteamGame, FilterType } from '../types';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';

interface Props {
  games: SteamGame[];
  activeFilter: FilterType;
  searchQuery: string;
}

export function SteamSection({ games, activeFilter, searchQuery }: Props) {
  const specials = games.filter((g) => g.isSpecial);
  const popular = games.filter((g) => g.isPopular);

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'steam_specials') && (
        <section aria-labelledby="steam-specials-title">
          <h2 id="steam-specials-title" className="section-title">
            <Flame size={22} className="icon-steam" aria-hidden="true" />
            Гарячі знижки Steam
          </h2>

          {specials.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>Нічого не знайдено</h3>
              <p>
                Наразі немає активних знижок у Steam, що відповідають вашому
                пошуку.
              </p>
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
            Трендові ігри Steam (Top Sellers)
          </h2>

          {popular.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>Нічого не знайдено</h3>
              <p>
                Не вдалося знайти популярних ігор, що відповідають запиту.
              </p>
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
