import { useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';

interface Props {
  minPrice: number;
  maxPrice: number;
  range: [number, number];
  onChange: (range: [number, number]) => void;
  currency?: string;
}

export function PriceRangeFilter({ minPrice, maxPrice, range, onChange, currency = 'UAH' }: Props) {
  const { t } = useLocale();
  const [show, setShow] = useState(false);

  const handleMinChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.max(minPrice, Math.min(val, range[1]));
    onChange([clamped, range[1]]);
  };

  const handleMaxChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.max(range[0], Math.min(val, maxPrice));
    onChange([range[0], clamped]);
  };

  const handleReset = () => {
    onChange([minPrice, maxPrice]);
  };

  return (
    <div className="price-range-filter">
      <button
        type="button"
        className={`price-range-toggle${show ? ' active' : ''}`}
        onClick={() => setShow((s) => !s)}
      >
        {show ? t.price.filterHide : t.price.filterToggle}
      </button>

      {show && (
        <div className="price-range-content">
          <div className="price-range-inputs">
            <label>
              {t.price.from}{' '}
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                value={range[0]}
                onChange={(e) => handleMinChange(e.target.value === '' ? minPrice : Number(e.target.value))}
                className="price-range-input"
              />{' '}
              {currency}
            </label>
            <label>
              {t.price.to}{' '}
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                value={range[1]}
                onChange={(e) => handleMaxChange(e.target.value === '' ? maxPrice : Number(e.target.value))}
                className="price-range-input"
              />{' '}
              {currency}
            </label>
            <button
              type="button"
              className="filter-btn filter-btn--sm"
              onClick={handleReset}
            >
              {t.price.reset}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
