import { useState, type ReactElement } from 'react';
import { useLocale } from '../contexts/LocaleContext';

interface Props {
  items: ReactElement[];
  initialCount?: number;
  step?: number;
  resetKey?: string;
}

export function ShowMore({ items, initialCount = 12, step = 12, resetKey }: Props) {
  const { t } = useLocale();
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(initialCount);
  }
  const hasMore = visibleCount < items.length;

  if (items.length === 0) return null;

  return (
    <>
      {items.slice(0, visibleCount)}
      {hasMore && (
        <div className="show-more-wrapper">
          <button
            type="button"
            className="show-more-btn"
            onClick={() => setVisibleCount((c) => c + step)}
          >
            {t.showMore.itemsLeft.replace('{count}', String(Math.min(step, items.length - visibleCount)))}
          </button>
        </div>
      )}
    </>
  );
}
