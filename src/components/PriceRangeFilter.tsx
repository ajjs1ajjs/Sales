import { useState, useMemo } from 'react';
import type { EpicGame, SteamGame, FilterType, SortType } from '../types';
import { WishlistButton } from './WishlistButton';

interface Props {
  games: EpicGame[] | SteamGame[];
  filterType: FilterType;
  sortType: SortType;
}

const MIN_PRICE_DEFAULT = 0;
const MAX_PRICE_DEFAULT = 10000;

export function PriceRangeFilter({ games, filterType, sortType }: Props) {
  const [show, setShow] = useState(false);

  const { minPrice, maxPrice } = useMemo(() => {
    if (games.length === 0) return { minPrice: 0, maxPrice: 0 };
    let min = Infinity;
    let max = -Infinity;
    for (const g of games) {
      const price = 'isFreeNow' in g && g.isFreeNow ? 0 : g.discountPrice;
      if (price < min) min = price;
      if (price > max) max = price;
    }
    return { minPrice: Math.floor(min), maxPrice: Math.ceil(max) };
  }, [games]);

  const [range, setRange] = useState<[number, number]>([MIN_PRICE_DEFAULT, MAX_PRICE_DEFAULT]);

  const filterLabel = (() => {
    switch (filterType) {
      case 'epic_free': return 'Epic Роздачі';
      case 'epic_discount': return 'Epic Знижки';
      case 'steam_specials': return 'Steam Знижки';
      case 'steam_popular': return 'Steam Тренди';
      default: return null;
    }
  })();

  if (games.length === 0 || !filterLabel) return null;

  return (
    <div className="price-range-filter">
      <button
        type="button"
        className={`price-range-toggle${show ? ' active' : ''}`}
        onClick={() => setShow((s) => !s)}
      >
        {show ? 'Приховати фільтр ціни' : 'Фільтр за ціною'}
      </button>

      {show && (
        <div className="price-range-content">
          <div className="price-range-inputs">
            <label>
              Від:{' '}
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                value={range[0]}
                onChange={(e) => setRange([Number(e.target.value), range[1]])}
                className="price-range-input"
              />{' '}
              грн
            </label>
            <label>
              До:{' '}
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                value={range[1]}
                onChange={(e) => setRange([range[0], Number(e.target.value)])}
                className="price-range-input"
              />{' '}
              грн
            </label>
            <button
              type="button"
              className="filter-btn filter-btn--sm"
              onClick={() => setRange([MIN_PRICE_DEFAULT, MAX_PRICE_DEFAULT])}
            >
              Скинути
            </button>
          </div>

          <div className="price-filtered-games">
            {games
              .filter((g) => {
                const price = 'isFreeNow' in g && g.isFreeNow ? 0 : g.discountPrice;
                return price >= range[0] && price <= range[1];
              })
              .sort(sortGames(sortType))
              .slice(0, 12)
              .map((game) => (
                <div key={game.id} className="price-filtered-item">
                  <img
                    src={game.imageUrl}
                    alt={game.title}
                    loading="lazy"
                    className="price-filtered-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="price-filtered-title">{game.title}</span>
                  <span className="price-filtered-price">
                    {'isFreeNow' in game && game.isFreeNow
                      ? 'БЕЗКОШТОВНО'
                      : `${game.discountPrice} ${game.currency === 'UAH' ? 'грн' : game.currency}`}
                  </span>
                  <WishlistButton gameId={game.id} title={game.title} />
                </div>
              ))}
            {games.filter((g) => {
              const price = 'isFreeNow' in g && g.isFreeNow ? 0 : g.discountPrice;
              return price >= range[0] && price <= range[1];
            }).length === 0 && (
              <p className="price-filtered-empty">Немає ігор у цьому діапазоні цін</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function sortGames(sortType: SortType) {
  return (a: EpicGame | SteamGame, b: EpicGame | SteamGame): number => {
    switch (sortType) {
      case 'name-asc':
        return a.title.localeCompare(b.title, 'uk');
      case 'name-desc':
        return b.title.localeCompare(a.title, 'uk');
      case 'price-asc':
        return a.discountPrice - b.discountPrice;
      case 'price-desc':
        return b.discountPrice - a.discountPrice;
      case 'discount-desc':
        return b.discountPercent - a.discountPercent;
      default:
        return 0;
    }
  };
}
