import { lazy, useEffect, useState, type FunctionComponent, Suspense, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Clock, RefreshCw, AlertCircle, History } from 'lucide-react';
import type { DealsData, FilterType, SortType, EpicGame, SteamGame } from './types';
import { ErrorBoundary } from './ErrorBoundary';
import { TelegramBanner } from './components/TelegramBanner';
import { SearchControls } from './components/SearchControls';
import { ThemeToggle } from './components/ThemeToggle';
import { InstallPWA } from './components/InstallPWA';
import { useDebounce } from './hooks/useDebounce';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatLastUpdated, isSteamNonGame } from './utils';

type SectionProps = {
  games: EpicGame[] | SteamGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
  nonGameIds?: Set<string>;
};

const EpicSection = lazy(() =>
  import('./components/EpicSection').then((m) => ({ default: m.EpicSection as FunctionComponent<SectionProps> })),
);
const SteamSection = lazy(() =>
  import('./components/SteamSection').then((m) => ({ default: m.SteamSection as FunctionComponent<SectionProps> })),
);
const HistoryPageLazy = lazy(() =>
  import('./components/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);

function HomePage() {
  const location = useLocation();
  const [data, setData] = useState<DealsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useLocalStorage<SortType>('sort-type', 'default');
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    const fetchData = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}data/deals.json`, { cache: 'no-cache' });

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
  }, [location.pathname]);

  const nonGameIds = useMemo(() => {
    const ids = new Set<string>();
    if (data) {
      for (const game of data.steam) {
        if (isSteamNonGame(game.imageUrl)) {
          ids.add(game.id);
        }
      }
    }
    return ids;
  }, [data]);

  const epicMatchingSearch =
    data?.epic.filter((game) =>
      game.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
    ) || [];

  const steamMatchingSearch =
    data?.steam.filter((game) =>
      game.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
    ) || [];

  const filterCounts = {
    all: epicMatchingSearch.length + steamMatchingSearch.length,
    epic_free: epicMatchingSearch.filter((game) => game.isFreeNow || game.isUpcomingFree).length,
    epic_discount: epicMatchingSearch.filter((game) => game.isDiscounted).length,
    steam_specials: steamMatchingSearch.filter((game) => game.isSpecial).length,
    steam_popular: steamMatchingSearch.filter((game) => game.isPopular).length,
  };

  const filteredEpic = epicMatchingSearch.filter((game) => {
    if (activeFilter === 'epic_free') return game.isFreeNow || game.isUpcomingFree;
    if (activeFilter === 'epic_discount') return game.isDiscounted;
    if (activeFilter === 'all') return true;
    return false;
  });

  const filteredSteam = steamMatchingSearch.filter((game) => {
    if (activeFilter === 'steam_specials') return game.isSpecial;
    if (activeFilter === 'steam_popular') return game.isPopular;
    if (activeFilter === 'all') return true;
    return false;
  });

  return (
    <ErrorBoundary>
      <header>
        <div className="header-top">
          <div className="header-left" />
          <div className="header-center">
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
          </div>
          <div className="header-right">
            <ThemeToggle />
            <Link to="/history" className="history-nav-link" aria-label="Історія сповіщень">
              <History size={18} />
            </Link>
          </div>
        </div>
      </header>

      <InstallPWA />
      <TelegramBanner />

      <SearchControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filterCounts={filterCounts}
        sortType={sortType}
        onSortChange={setSortType}
      />

      <Suspense fallback={<div className="deals-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="game-card skeleton-card"><div className="card-image-wrapper skeleton-bg" /><div className="card-content"><div className="skeleton-line skeleton-title" /><div className="skeleton-line skeleton-desc" /></div></div>)}</div>}>
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
                searchQuery={debouncedSearch}
                sortType={sortType}
              />
              <SteamSection
                games={filteredSteam}
                activeFilter={activeFilter}
                searchQuery={debouncedSearch}
                sortType={sortType}
                nonGameIds={nonGameIds}
              />

              {activeFilter === 'all' &&
                filteredEpic.length === 0 &&
                filteredSteam.length === 0 &&
                !debouncedSearch && (
                  <div className="empty-state section-gap-top">
                    <h3>Немає доступних пропозицій</h3>
                    <p>Спробуйте змінити фільтри або зайдіть пізніше.</p>
                  </div>
                )}
            </>
          )}
        </main>
      </Suspense>

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

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={
          <Suspense fallback={<div className="empty-state loading-state" role="status"><RefreshCw size={40} className="spinner" /><h3>Завантаження...</h3></div>}>
            <HistoryPageWrapper />
          </Suspense>
        } />
      </Routes>
    </HashRouter>
  );
}

function HistoryPageWrapper() {
  const [data, setData] = useState<DealsData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}data/deals.json`, { cache: 'no-cache' });
        if (res.ok) {
          setData(await res.json());
        }
      } catch { /* ignore */ }
    };
    fetchData();
  }, []);

  return (
    <ErrorBoundary>
      <div style={{ padding: '24px 0' }}>
        <HistoryPageLazy data={data} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
