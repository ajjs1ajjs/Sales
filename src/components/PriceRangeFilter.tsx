import { useState } from 'react';

interface Props {
  minPrice: number;
  maxPrice: number;
  range: [number, number];
  onChange: (range: [number, number]) => void;
}

export function PriceRangeFilter({ minPrice, maxPrice, range, onChange }: Props) {
  const [show, setShow] = useState(false);

  const handleMinChange = (val: number) => {
    // Clamp min change to absolute minPrice and current max range value
    const clamped = Math.max(minPrice, Math.min(val, range[1]));
    onChange([clamped, range[1]]);
  };

  const handleMaxChange = (val: number) => {
    // Clamp max change to current min range value and absolute maxPrice
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
                onChange={(e) => handleMinChange(Number(e.target.value))}
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
                onChange={(e) => handleMaxChange(Number(e.target.value))}
                className="price-range-input"
              />{' '}
              грн
            </label>
            <button
              type="button"
              className="filter-btn filter-btn--sm"
              onClick={handleReset}
            >
              Скинути
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
