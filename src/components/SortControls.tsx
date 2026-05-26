import type { SortType } from '../types';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

interface Props {
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
}

const sortOptions: { key: SortType; label: string }[] = [
  { key: 'default', label: 'За замовчуванням' },
  { key: 'discount-desc', label: 'Найбільша знижка' },
  { key: 'price-asc', label: 'Найдешевші' },
  { key: 'price-desc', label: 'Найдорожчі' },
  { key: 'name-asc', label: 'Назва А-Я' },
  { key: 'name-desc', label: 'Назва Я-А' },
];

export function SortControls({ sortType, onSortChange }: Props) {
  return (
    <div className="sort-controls" role="group" aria-label="Сортування ігор">
      <ArrowUpDown size={16} className="sort-icon" aria-hidden="true" />
      <select
        className="sort-select"
        value={sortType}
        onChange={(e) => onSortChange(e.target.value as SortType)}
        aria-label="Сортувати за"
      >
        {sortOptions.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {sortType !== 'default' && (
        <span className="sort-indicator" aria-hidden="true">
          {sortType.includes('desc') ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
        </span>
      )}
    </div>
  );
}
