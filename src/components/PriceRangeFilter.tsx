import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';

interface Props {
  minPrice: number;
  maxPrice: number;
  range: [number, number];
  onChange: (range: [number, number]) => void;
  currency?: string;
}

// Prices in deals.json are not integers (e.g. 46.75), so the inputs keep the
// raw string the user typed and parse it manually — a controlled `type=number`
// plus digit-only stripping made decimals impossible to enter.
function parsePrice(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.').replace(/[^0-9.]/g, '');
  if (normalized === '' || normalized === '.') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function PriceRangeFilter({ minPrice, maxPrice, range, onChange, currency = 'UAH' }: Props) {
  const { t } = useLocale();
  const [rangeMin, rangeMax] = range;
  const [show, setShow] = useState(false);
  const [minInput, setMinInput] = useState(() => String(rangeMin));
  const [maxInput, setMaxInput] = useState(() => String(rangeMax));
  const minFocused = useRef(false);
  const maxFocused = useRef(false);

  // Sync with the external range (Reset button, new data load) but never
  // overwrite what the user is actively typing.
  useEffect(() => {
    if (!minFocused.current) setMinInput(String(rangeMin));
  }, [rangeMin]);
  useEffect(() => {
    if (!maxFocused.current) setMaxInput(String(rangeMax));
  }, [rangeMax]);

  const handleMinChange = (raw: string) => {
    setMinInput(raw);
    const parsed = parsePrice(raw);
    if (parsed === null) return;
    const clamped = Math.max(minPrice, Math.min(parsed, rangeMax));
    if (clamped !== rangeMin) onChange([clamped, rangeMax]);
  };

  const handleMaxChange = (raw: string) => {
    setMaxInput(raw);
    const parsed = parsePrice(raw);
    if (parsed === null) return;
    const clamped = Math.max(rangeMin, Math.min(parsed, maxPrice));
    if (clamped !== rangeMax) onChange([rangeMin, clamped]);
  };

  const commitMin = () => {
    const parsed = parsePrice(minInput);
    const clamped = parsed === null ? rangeMin : Math.max(minPrice, Math.min(parsed, rangeMax));
    setMinInput(String(clamped));
    if (clamped !== rangeMin) onChange([clamped, rangeMax]);
  };

  const commitMax = () => {
    const parsed = parsePrice(maxInput);
    const clamped = parsed === null ? rangeMax : Math.max(rangeMin, Math.min(parsed, maxPrice));
    setMaxInput(String(clamped));
    if (clamped !== rangeMax) onChange([rangeMin, clamped]);
  };

  const handleReset = () => {
    setMinInput(String(minPrice));
    setMaxInput(String(maxPrice));
    onChange([minPrice, maxPrice]);
  };

  const contentId = 'price-range-content';

  return (
    <div className="price-range-filter">
      <button
        type="button"
        className={`price-range-toggle${show ? ' active' : ''}`}
        onClick={() => setShow((s) => !s)}
        aria-expanded={show}
        aria-controls={show ? contentId : undefined}
      >
        {show ? t.price.filterHide : t.price.filterToggle}
      </button>

      {show && (
        <div className="price-range-content" id={contentId}>
          <div className="price-range-inputs">
            <label>
              {t.price.from}{' '}
              <input
                type="text"
                inputMode="decimal"
                value={minInput}
                onChange={(e) => handleMinChange(e.target.value)}
                onFocus={() => { minFocused.current = true; }}
                onBlur={() => { minFocused.current = false; commitMin(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitMin(); } }}
                className="price-range-input"
              />{' '}
              {currency}
            </label>
            <label>
              {t.price.to}{' '}
              <input
                type="text"
                inputMode="decimal"
                value={maxInput}
                onChange={(e) => handleMaxChange(e.target.value)}
                onFocus={() => { maxFocused.current = true; }}
                onBlur={() => { maxFocused.current = false; commitMax(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitMax(); } }}
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
