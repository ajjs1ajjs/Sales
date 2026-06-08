import { Search, X } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { FilterType, SortType } from '../types';
import { SortControls } from './SortControls';

interface Props {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  filterCounts?: Record<FilterType, number>;
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
}

export function SearchControls({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
  sortType,
  onSortChange,
}: Props) {
  const { t } = useLocale();
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t.filters.all },
    { key: 'epic_free', label: t.filters.epicFree },
    { key: 'epic_discount', label: t.filters.epicDiscount },
    { key: 'steam_specials', label: t.filters.steamSpecials },
    { key: 'steam_popular', label: t.filters.steamPopular },
    { key: 'wishlist', label: t.filters.wishlist },
  ];

  return (
    <section className="controls-container" aria-label={t.filters.controlsAria}>
      <div className="controls-top">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <label htmlFor="search-games" className="visually-hidden">
            {t.app.searchLabel}
          </label>
          <input
            type="text"
            id="search-games"
            placeholder={t.app.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
              aria-label={t.app.clearSearch}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <SortControls sortType={sortType} onSortChange={onSortChange} />
      </div>

      <div className="filter-group" role="group" aria-label={t.filters.ariaLabel}>
        {filters.map(({ key, label }) => {
          const count = filterCounts ? filterCounts[key] : undefined;
          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`filter-btn${activeFilter === key ? ' active' : ''}`}
              aria-pressed={activeFilter === key}
              type="button"
            >
              {label}
              {count !== undefined && <span className="filter-count"> ({count})</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
