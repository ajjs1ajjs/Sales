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

interface FilterItem { filterKey: FilterType; label: string }

function FilterBtn({ filterKey, label, count, active, onClick }: FilterItem & { count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      key={filterKey}
      onClick={onClick}
      className={`filter-btn${active ? ' active' : ''}`}
      aria-pressed={active}
      type="button"
    >
      {label}
      {count !== undefined && <span className="filter-count"> ({count})</span>}
    </button>
  );
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

  const groupedFilters: { label: string; items: FilterItem[] }[] = [
    {
      label: '',
      items: [
        { filterKey: 'all', label: t.filters.all },
        { filterKey: 'wishlist', label: t.filters.wishlist },
      ],
    },
    {
      label: 'Epic Games',
      items: [
        { filterKey: 'epic_free', label: t.filters.epicFree },
        { filterKey: 'epic_discount', label: t.filters.epicDiscount },
      ],
    },
    {
      label: 'Steam',
      items: [
        { filterKey: 'steam_free', label: t.filters.steamFree },
        { filterKey: 'steam_specials', label: t.filters.steamSpecials },
      ],
    },
    {
      label: 'Xbox Game Pass (PC)',
      items: [
        { filterKey: 'xbox_new', label: t.filters.xboxNew },
      ],
    },
  ];

  function renderGroup(group: typeof groupedFilters[number]) {
    return (
      <div key={group.label || 'main'} className="filter-group-row">
        {group.label && <span className="filter-group-label">{group.label}</span>}
        {group.items.map((filter) => (
          <FilterBtn
            key={filter.filterKey}
            filterKey={filter.filterKey}
            label={filter.label}
            count={filterCounts?.[filter.filterKey]}
            active={activeFilter === filter.filterKey}
            onClick={() => onFilterChange(filter.filterKey)}
          />
        ))}
      </div>
    );
  }

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
        {groupedFilters.map(renderGroup)}
      </div>
    </section>
  );
}
