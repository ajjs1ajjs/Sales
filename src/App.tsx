import { lazy, useEffect, useState } from 'react';
import type { FunctionComponent } from 'react';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';
import type { DealsData, FilterType, EpicGame, SteamGame } from './types';
import { ErrorBoundary } from './ErrorBoundary';
import { TelegramBanner } from './components/TelegramBanner';
import { SearchControls } from './components/SearchControls';

type SectionProps = {
  games: EpicGame[] | SteamGame[];
  activeFilter: FilterType;
  searchQuery: string;
};

const EpicSection = lazy(() =>
  import('./components/EpicSection').then((m) => ({ default: m.EpicSection as FunctionComponent<SectionProps> })),
);
const SteamSection = lazy(() =>
  import('./components/SteamSection').then((m) => ({ default: m.SteamSection as FunctionComponent<SectionProps> })),
);

function formatLastUpdated(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Kyiv',
    };
    return d.toLocaleDateString('uk-UA', options);
  } catch {
    return dateStr;
  }
}

function App() {
  const [data, setData] = useState<DealsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}data/deals.json?t=${Date.now()}`);

        if (!res.ok) {
          throw new Error(`Не вдалося завантажити дані (статус: ${res.status})`);
        }

        const jsonData = (await res.json()) as DealsData;
        setData(jsonData);
        setError(null);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Сталася помилка при завантаженні знижок.';
        console.error('Помилка завантаження даних:', err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEpic =
    data?.epic.filter((game) => {
      const matchesSearch = game.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeFilter === 'epic_free') return game.isFreeNow || game.isUpcomingFree;
      if (activeFilter === 'epic_discount') return game.isDiscounted;
      if (activeFilter === 'all') return true;
      return false;
    }) || [];

  const filteredSteam =
    data?.steam.filter((game) => {
      const matchesSearch = game.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeFilter === 'steam_specials') return game.isSpecial;
      if (activeFilter === 'steam_popular') return game.isPopular;
      if (activeFilter === 'all') return true;
      return false;
    }) || [];

  return (
    <ErrorBoundary>
      <header>
        <h1>Game Sales Aggregator</h1>
        <p>
          Ваш персональний радар знижок та новинок. Безкоштовні ігри від Epic
          Games Store, знижки, хіти та нові релізи Steam.
        </p>

        {data?.lastUpdated && (
          <div className="last-updated">
            <Clock size={14} aria-hidden="true" />
            <span>
              Останнє оновлення: <b>{formatLastUpdated(data.lastUpdated)}</b>
            </span>
          </div>
        )}
      </header>

      <TelegramBanner />

      <SearchControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <main>
        {loading && (
          <div className="empty-state loading-state" role="status" aria-live="polite">
            <RefreshCw size={40} className="spinner" aria-hidden="true" />
            <h3>Завантаження даних з серверів...</h3>
            <p>Будь ласка, зачекайте.</p>
          </div>
        )}

        {error && (
          <div className="empty-state error-state" role="alert">
            <AlertCircle size={40} className="error-icon" aria-hidden="true" />
            <h3>Не вдалося завантажити дані</h3>
            <p>{error}</p>
            <p className="error-hint">
              Переконайтеся, що робочий процес GitHub Actions успішно виконався
              та згенерував файл даних.
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <EpicSection
              games={filteredEpic}
              activeFilter={activeFilter}
              searchQuery={searchQuery}
            />
            <SteamSection
              games={filteredSteam}
              activeFilter={activeFilter}
              searchQuery={searchQuery}
            />

            {activeFilter === 'all' &&
              filteredEpic.length === 0 &&
              filteredSteam.length === 0 &&
              !searchQuery && (
                <div className="empty-state section-gap-top">
                  <h3>Немає доступних пропозицій</h3>
                  <p>Спробуйте змінити фільтри або зайдіть пізніше.</p>
                </div>
              )}
          </>
        )}
      </main>

      <footer>
        <p>&copy; {new Date().getFullYear()} Game Sales Aggregator. Усі права захищено.</p>
        <p>
          Розроблено для геймерів з ❤️. Дані надано неофіційними API Steam та
          Epic Games Store.
        </p>
        <p className="footer-link">
          Код проекту доступний на{' '}
          <a
            href="https://github.com/ajjs1ajjs/Sales"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </footer>
    </ErrorBoundary>
  );
}

export default App;
