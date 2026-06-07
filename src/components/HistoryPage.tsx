import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import type { DealsData } from '../types';
import { formatDate } from '../utils';

interface Props {
  data: DealsData | null;
  loading?: boolean;
}

type HistoryFilter = 'all' | 'free' | 'discount' | 'popular';

export function HistoryPage({ data, loading = false }: Props) {
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
        <h3>Завантаження історії...</h3>
        <p>Будь ласка, зачекайте.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state" role="status">
        <Calendar size={40} className="icon-muted" aria-hidden="true" />
        <h3>Історія недоступна</h3>
        <p>Завантажте дані, щоб переглянути історію знижок.</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1 className="history-title">
          <Calendar size={24} aria-hidden="true" />
          Історія сповіщень
        </h1>
        <p className="history-subtitle">
          Останні 30 днів виявлених знижок, роздач та хітів продажів.
        </p>
      </div>

      <div className="history-filters" role="group" aria-label="Фільтри історії">
        {([
          ['all', 'Всі'],
          ['free', 'Роздачі'],
          ['discount', 'Знижки'],
          ['popular', 'Тренди'],
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
          <h3>Немає записів</h3>
          <p>За цим фільтром історія порожня.</p>
        </div>
      ) : (
        <div className="history-list">
          {filtered.map((item) => (
            <div key={item.key} className={`history-item history-item--${item.type}`}>
              <div className="history-item-main">
                <span className={`history-badge history-badge--${item.type}`}>
                  {item.type === 'free' ? 'FREE' : item.type === 'discount' ? `-${item.percent}%` : 'TOP'}
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
          На головну
        </Link>
      </p>
    </div>
  );
}
