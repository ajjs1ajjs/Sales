import { AlertCircle } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { findStaleSources } from '../freshness';
import type { SourceUpdates } from '../types';
import { formatLastUpdated, formatLastUpdatedEn, interp } from '../utils';

interface DataFreshnessProps {
  sourceUpdates?: SourceUpdates;
  refreshError: string | null;
  lastFetchedAt: number | null;
}

export function DataFreshness({ sourceUpdates, refreshError, lastFetchedAt }: DataFreshnessProps) {
  const { locale, t } = useLocale();
  const formatUpdate = locale === 'en' ? formatLastUpdatedEn : formatLastUpdated;
  const staleSources = findStaleSources(sourceUpdates);

  if (!refreshError && staleSources.length === 0) return null;

  const refreshMessage = refreshError
    ? lastFetchedAt
      ? interp(t.app.refreshFailedAt).map((part, i) =>
          part.key === 'date'
            ? <span key={i}>{formatUpdate(new Date(lastFetchedAt).toISOString())}</span>
            : <span key={i}>{part.text}</span>
        )
      : t.app.refreshFailed
    : null;

  return (
    <div className="data-warnings">
      {refreshMessage && (
        <p className="data-warning" role="status" title={refreshError ?? undefined}>
          <AlertCircle size={14} aria-hidden="true" />
          <span>{refreshMessage}</span>
        </p>
      )}
      {staleSources.map((source) => (
        <p key={source.key} className="data-warning" role="status">
          <AlertCircle size={14} aria-hidden="true" />
          <span>
            {interp(t.app.sourceStale).map((part, i) => {
              if (part.key === 'source') return <span key={i}>{source.label}</span>;
              if (part.key === 'date') return <span key={i}>{formatUpdate(source.date)}</span>;
              return <span key={i}>{part.text}</span>;
            })}
          </span>
        </p>
      ))}
    </div>
  );
}
