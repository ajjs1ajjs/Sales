import { Search } from 'lucide-react';
import type { FilterType } from '../types';

interface Props {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  filterCounts?: Record<FilterType, number>;
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
}: Props) {
  return (
    <section className="controls-container" aria-label="Фільтри та пошук">
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
