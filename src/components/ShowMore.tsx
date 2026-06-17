import { useState, type ReactElement } from 'react';
import { useLocale } from '../contexts/LocaleContext';

interface Props {
  items: ReactElement[];
  initialCount?: number;
  step?: number;
}

export function ShowMore({ items, initialCount = 12, step = 12 }: Props) {
  const { t } = useLocale();
  const [visibleCount, setVisibleCount] = useState(initialCount);
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
