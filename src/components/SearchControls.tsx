import { Search } from 'lucide-react';
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

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Всі категорії' },
  { key: 'epic_free', label: 'Epic Роздачі' },
  { key: 'epic_discount', label: 'Epic Знижки' },
  { key: 'steam_specials', label: 'Steam Знижки' },
  { key: 'steam_popular', label: 'Steam Тренди' },
];

export function SearchControls({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
  sortType,
  onSortChange,
}: Props) {
  return (
    <section className="controls-container" aria-label="Фільтри та пошук">
      <div className="controls-top">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <label htmlFor="search-games" className="visually-hidden">
            Пошук гри за назвою
          </label>
          <input
            type="text"
            id="search-games"
            placeholder="Пошук гри за назвою..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
        <SortControls sortType={sortType} onSortChange={onSortChange} />
      </div>

      <div className="filter-group" role="group" aria-label="Фільтри категорій">
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
