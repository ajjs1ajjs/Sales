import { useMemo, type ReactElement } from 'react';

interface Props {
  count?: number;
}

export function Skeleton({ count = 6 }: Props) {
  const items = useMemo<ReactElement[]>(() => {
    const result: ReactElement[] = [];
    for (let i = 0; i < count; i++) {
      result.push(
        <article key={i} className="game-card skeleton-card" aria-hidden="true">
          <div className="card-image-wrapper skeleton-bg" />
          <div className="card-content">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-desc" />
            <div className="skeleton-line skeleton-desc skeleton-desc--short" />
            <div className="card-footer">
              <div className="skeleton-line skeleton-price" />
              <div className="skeleton-line skeleton-btn" />
            </div>
          </div>
        </article>,
      );
    }
    return result;
  }, [count]);
  return <>{items}</>;
}
