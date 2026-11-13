import { useState, type FormEvent } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useWishlist } from '../contexts/WishlistContext';
import type { PriceObservation } from '../types';
import { formatPrice } from '../utils';

interface Props {
  id: string;
  title: string;
  currency: string;
  currentPrice?: number;
  observations: PriceObservation[];
}

export function PriceTracking({ id, title, currency, currentPrice, observations }: Props) {
  const { locale, t } = useLocale();
  const { targets, setTarget } = useWishlist();
  const target = targets[id];
  const [input, setInput] = useState(() => target?.amount.toString() ?? '');
  const [error, setError] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim().replace(',', '.');
    const amount = Number(trimmed);
    if (!trimmed || !Number.isFinite(amount) || amount < 0 || amount > 100000000) { setError(true); return; }
    setTarget(id, { amount, currency });
    setError(false);
  };
  const targetMet = target && target.currency === currency && currentPrice !== undefined && currentPrice <= target.amount;

  return <div className="price-tracking">
    <form onSubmit={submit}>
      <label htmlFor={`target-${id}`}>{t.tracking.targetLabel.replace('{currency}', currency)}</label>
      <div className="price-target-controls">
        <input id={`target-${id}`} type="text" inputMode="decimal" value={input} onChange={event => { setInput(event.target.value); setError(false); }} aria-label={`${t.tracking.targetLabel.replace('{currency}', currency)} — ${title}`} />
        <button type="submit" className="filter-btn">{t.tracking.save}</button>
        {target && <button type="button" className="filter-btn" onClick={() => { setTarget(id, null); setInput(''); setError(false); }}>{t.tracking.clear}</button>}
      </div>
      {error && <p role="alert">{t.tracking.invalid}</p>}
    </form>
    {target && <p className="card-desc">{t.tracking.savedTarget.replace('{price}', formatPrice(target.amount, target.currency, locale))}</p>}
    {targetMet && <p className="target-met" role="status">{t.tracking.targetMet}</p>}
    {target && target.currency !== currency && <p className="card-desc">{t.tracking.currencyChanged}</p>}
    <PriceHistory title={title} currency={currency} observations={observations} />
  </div>;
}

export function PriceHistory({ title, currency, observations }: Pick<Props, 'title' | 'currency' | 'observations'>) {
  const { locale, t } = useLocale();
  const samples = observations.filter(item => item.currency === currency);
  const minPrice = samples.length ? Math.min(...samples.map(item => item.price)) : null;
  const maxPrice = samples.length ? Math.max(...samples.map(item => item.price)) : null;
  const firstTime = samples.length ? Date.parse(samples[0].date) : 0;
  const lastTime = samples.length ? Date.parse(samples[samples.length - 1].date) : 0;
  const points = samples.map((item, index) => ({
    x: samples.length === 1 ? 150 : 10 + (lastTime === firstTime ? index / (samples.length - 1) : (Date.parse(item.date) - firstTime) / (lastTime - firstTime)) * 280,
    y: 65 - (maxPrice === minPrice ? 0.5 : (item.price - minPrice!) / (maxPrice! - minPrice!)) * 50,
  }));
  return <details className="price-history">
      <summary>{t.tracking.history}</summary>
      <p className="card-desc">{t.tracking.historyDescription}</p>
      {samples.length === 0 ? <p>{t.tracking.noHistory}</p> : <>
        <p>{t.tracking.observedMin.replace('{price}', formatPrice(minPrice!, currency, locale))}</p>
        <svg viewBox="0 0 300 80" role="img" aria-label={`${t.tracking.chartLabel} — ${title}`} className="price-chart">
          {points.slice(1).map((point, index) => {
            const isGap = Date.parse(samples[index + 1].date) - Date.parse(samples[index].date) > 86400000;
            return (
              <line
                key={`${samples[index].date}-${samples[index + 1].date}`}
                x1={points[index].x}
                y1={points[index].y}
                x2={point.x}
                y2={point.y}
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={isGap ? '3 3' : undefined}
                strokeOpacity={isGap ? 0.45 : undefined}
              />
            );
          })}
          {points.map((point, index) => <circle key={`${samples[index].date}-${index}`} cx={point.x} cy={point.y} r="3" fill="currentColor"><title>{samples[index].date}: {formatPrice(samples[index].price, currency, locale)}</title></circle>)}
        </svg>
        <div className="price-chart-dates"><span>{samples[0].date}</span><span>{samples[samples.length - 1].date}</span></div>
        <details><summary>{t.tracking.showObservations}</summary><ul className="price-observations">{samples.map((item, index) => <li key={`${item.date}-${index}`}>{item.date}: {formatPrice(item.price, item.currency, locale)}</li>)}</ul></details>
      </>}
    </details>;
}
