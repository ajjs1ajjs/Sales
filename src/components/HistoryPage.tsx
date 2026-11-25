import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { DealsData } from '../types';
import { formatDate, formatDateEn, safeHistoryType, safeUrl } from '../utils';

interface Props {
  data: DealsData | null;
  loading?: boolean;
}

type HistoryFilter = 'all' | 'free' | 'discount' | 'dlc' | 'popular' | 'gamepass' | 'playstation';

function getHistoryItemUrl(key: string): string | null {
  if (key.startsWith('steam_free_')) {
    const id = key.slice('steam_free_'.length);
    return id ? safeUrl(`https://store.steampowered.com/app/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('steam_discount_')) {
    const id = key.slice('steam_discount_'.length);
    return id ? safeUrl(`https://store.steampowered.com/app/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('steam_dlc_')) {
    const id = key.slice('steam_dlc_'.length);
    return id ? safeUrl(`https://store.steampowered.com/app/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('steam_popular_')) {
    const id = key.slice('steam_popular_'.length);
    return id ? safeUrl(`https://store.steampowered.com/app/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('gamepass_deal_')) {
    const id = key.slice('gamepass_deal_'.length);
    return id ? safeUrl(`https://www.xbox.com/games/store/game/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('gamepass_popular_')) {
    const id = key.slice('gamepass_popular_'.length);
    return id ? safeUrl(`https://www.xbox.com/games/store/game/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('gamepass_')) {
    const id = key.slice('gamepass_'.length);
    return id ? safeUrl(`https://www.xbox.com/games/store/game/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('ps_deal_')) {
    const id = key.slice('ps_deal_'.length);
    return id ? safeUrl(`https://store.playstation.com/uk-ua/product/${encodeURIComponent(id)}`) : null;
  }
  if (key.startsWith('ps_essential_') || key.startsWith('ps_extra_')) {
    return safeUrl('https://store.playstation.com/uk-ua/pages/subscriptions');
  }
  return null;
}

export function HistoryPage({ data, loading = false }: Props) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const history = useMemo(() => {
    if (!data?.notifiedHistory) return [];
    // У файлі gamepass-записи живуть довше (щоб не дублювати пости), але
    // історія для всіх джерел однакова — останні 30 днів.
    const cutoff = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    return Object.entries(data.notifiedHistory)
      .map(([key, item]) => ({ key, ...item }))
      .filter((item) => {
        const time = new Date(item.timestamp).getTime();
        return !Number.isNaN(time) && time >= cutoff;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data]);

  const filtered = useMemo(() => {
    if (filter === 'all') return history;
    if (filter === 'playstation') {
      return history.filter((item) => {
        const type = safeHistoryType(item.type);
        return type === 'ps_deal' || type === 'ps_essential' || type === 'ps_extra';
      });
    }
    if (filter === 'gamepass') {
      return history.filter((item) => {
        const type = safeHistoryType(item.type);
        return type === 'gamepass' || type === 'gamepass_deal';
      });
    }
    // safeHistoryType: легасі-записи xbox_new фільтруються як gamepass.
    return history.filter((item) => safeHistoryType(item.type) === filter);
  }, [history, filter]);

  if (loading) {
    return (
      <div className="empty-state loading-state" role="status" aria-live="polite">
        <RefreshCw size={40} className="spinner" aria-hidden="true" />
        <h3>{t.history.loading}</h3>
        <p>{t.app.loadingDesc}</p>
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
          ['dlc', t.history.dlc],
          ['popular', t.history.popular],
          ['gamepass', t.history.gamepass],
          ['playstation', t.history.playstation],
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
          {filtered.map((item) => {
            const itemUrl = getHistoryItemUrl(item.key);
            const normalizedType = safeHistoryType(item.type);
            const isPs = normalizedType === 'ps_deal' || normalizedType === 'ps_essential' || normalizedType === 'ps_extra';
            const platformName = item.type === 'gamepass' || item.type === 'gamepass_deal' || item.type === 'xbox_new'
              ? t.platform.gamepass
              : isPs
                ? t.platform.playstation
                : t.platform.steam;
            const badgeText = ({
              free: t.history.freeBadge,
              discount: `-${item.percent}%`,
              dlc: `DLC -${item.percent}%`,
              popular: t.history.topBadge,
              gamepass: t.history.gamepassBadge,
              gamepass_deal: `GP -${item.percent}%`,
              ps_deal: `PS5 -${item.percent}%`,
              ps_essential: t.history.psEssentialBadge,
              ps_extra: t.history.psExtraBadge,
            } satisfies Record<string, string>)[normalizedType] ?? t.history.freeBadge;
            return (
              <div key={item.key} className={`history-item history-item--${normalizedType}`}>
                <div className="history-item-main">
                  <span className={`history-badge history-badge--${normalizedType}`}>
                    {badgeText}
                  </span>
                  <span className="history-item-title">{item.title}</span>
                </div>
                <div className="history-item-meta">
                  <span className="history-item-date">
                    {locale === 'en' ? formatDateEn(item.timestamp, true) : formatDate(item.timestamp, true)}
                  </span>
                  {itemUrl ? (
                    <a
                      href={itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="history-external-link"
                      aria-label={`${item.title} (${platformName})`}
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
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
