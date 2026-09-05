import type { SortType } from '../types';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

interface Props {
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
}

export function SortControls({ sortType, onSortChange }: Props) {
  const { t } = useLocale();
  const sortOptions: { key: SortType; label: string }[] = [
    { key: 'default', label: t.sort.default },
    { key: 'discount-desc', label: t.sort.discountDesc },
    { key: 'price-asc', label: t.sort.priceAsc },
    { key: 'price-desc', label: t.sort.priceDesc },
    { key: 'name-asc', label: t.sort.nameAsc },
    { key: 'name-desc', label: t.sort.nameDesc },
  ];

  return (
    <div className="sort-controls" role="group" aria-label={t.sort.groupAria}>
      <ArrowUpDown size={16} className="sort-icon" aria-hidden="true" />
      <select
        className="sort-select"
        value={sortType}
        onChange={(e) => onSortChange(e.target.value as SortType)}
        aria-label={t.sort.label}
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
