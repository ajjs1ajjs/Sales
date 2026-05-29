import { useMemo } from 'react';
import { Flame, TrendingUp, Gamepad2 } from 'lucide-react';
import type { SteamGame, FilterType, SortType } from '../types';
import { isSteamNonGame } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';

interface Props {
  games: SteamGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
  nonGameIds?: Set<string>;
}

function sortSteamGames(games: SteamGame[], sortType: SortType): SteamGame[] {
  const sorted = [...games];
  switch (sortType) {
    case 'name-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    case 'name-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title, 'uk'));
    case 'price-asc':
      return sorted.sort((a, b) => a.discountPrice - b.discountPrice);
    case 'price-desc':
      return sorted.sort((a, b) => b.discountPrice - a.discountPrice);
    case 'discount-desc':
      return sorted.sort((a, b) => b.discountPercent - a.discountPercent);
    default:
      return sorted;
  }
}

export function SteamSection({ games, activeFilter, searchQuery, sortType, nonGameIds }: Props) {
  const sorted = useMemo(() => sortSteamGames(games, sortType), [games, sortType]);

  const specials = sorted.filter((g) => g.isSpecial);
  const popular = sorted.filter((g) => {
    if (!g.isPopular) return false;
    if (nonGameIds?.has(g.id)) return false;
    return !isSteamNonGame(g.imageUrl);
  });

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
          <h3>За запитом &ldquo;{searchQuery}&rdquo; ігор не знайдено</h3>
          <p>Спробуйте змінити пошуковий запит або скинути фільтри.</p>
        </div>
      )}
    </>
  );
}
