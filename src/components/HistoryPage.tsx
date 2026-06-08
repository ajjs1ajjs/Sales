import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { DealsData } from '../types';
import { formatDate } from '../utils';

interface Props {
  data: DealsData | null;
  loading?: boolean;
  locale?: string;
}

type HistoryFilter = 'all' | 'free' | 'discount' | 'popular';

export function HistoryPage({ data, loading = false }: Props) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const history = useMemo(() => {
    if (!data?.notifiedHistory) return [];
    return Object.entries(data.notifiedHistory)
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data]);

  const filtered = useMemo(() => {
    if (filter === 'all') return history;
    return history.filter((item) => item.type === filter);
  }, [history, filter]);

  if (loading) {
    return (
      <div className="empty-state loading-state" role="status" aria-live="polite">
        <RefreshCw size={40} className="spinner" aria-hidden="true" />
        <h3>{t.history.loading}</h3>
        <p>Будь ласка, зачекайте.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state" role="status">
        <Calendar size={40} className="icon-muted" aria-hidden="true" />
        <h3>{t.history.unavailable}</h3>
        <p>{t.history.unavailableDesc}</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1 className="history-title">
          <Calendar size={24} aria-hidden="true" />
          {t.history.title}
        </h1>
        <p className="history-subtitle">
          {t.history.subtitle}
        </p>
      </div>

      <div className="history-filters" role="group" aria-label={t.history.filterAria}>
        {([
          ['all', t.history.all],
          ['free', t.history.free],
          ['discount', t.history.discount],
          ['popular', t.history.popular],
        ] as [HistoryFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`filter-btn${filter === key ? ' active' : ''}`}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{t.history.empty}</h3>
          <p>{t.history.emptyDesc}</p>
        </div>
      ) : (
        <div className="history-list">
          {filtered.map((item) => (
            <div key={item.key} className={`history-item history-item--${item.type}`}>
              <div className="history-item-main">
                <span className={`history-badge history-badge--${item.type}`}>
                  {item.type === 'free' ? t.history.freeBadge : item.type === 'discount' ? `-${item.percent}%` : t.history.topBadge}
                </span>
                <span className="history-item-title">{item.title}</span>
              </div>
              <div className="history-item-meta">
                <span className="history-item-date">
                  {formatDate(item.timestamp, true)}
                </span>
                {item.type === 'free' ? (
                  <ExternalLink size={14} aria-hidden="true" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '32px' }}>
        <Link to="/" className="store-link">
          {t.app.backToHome}
        </Link>
      </p>
    </div>
  );
}
