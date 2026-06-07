import { lazy, useEffect, useState, type FunctionComponent, Suspense, useMemo } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { Clock, RefreshCw, AlertCircle, History } from 'lucide-react';
import type { FilterType, SortType, EpicGame, SteamGame } from './types';
import { ErrorBoundary } from './ErrorBoundary';
import { TelegramBanner } from './components/TelegramBanner';
import { SearchControls } from './components/SearchControls';
import { ThemeToggle } from './components/ThemeToggle';
import { InstallPWA } from './components/InstallPWA';
import { PriceRangeFilter } from './components/PriceRangeFilter';
import { useDebounce } from './hooks/useDebounce';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DataProvider, useData } from './DataContext';
import { formatLastUpdated, isSteamNonGame } from './utils';
import { Skeleton } from './components/Skeleton';

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
  const { data, loading, error } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useLocalStorage<SortType>('sort-type', 'default');
  const [wishlist] = useLocalStorage<string[]>('wishlist', []);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [userPriceRange, setUserPriceRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const { absoluteMinPrice, absoluteMaxPrice } = useMemo(() => {
    if (!data) return { absoluteMinPrice: 0, absoluteMaxPrice: 10000 };
    let min = Infinity;
    let max = -Infinity;

    for (const g of data.epic) {
      const price = g.isFreeNow ? 0 : g.discountPrice;
      if (price < min) min = price;
      if (price > max) max = price;
    }

    for (const g of data.steam) {
      const price = g.discountPrice;
      if (price < min) min = price;
      if (price > max) max = price;
    }

    return {
      absoluteMinPrice: min === Infinity ? 0 : Math.floor(min),
      absoluteMaxPrice: max === -Infinity ? 10000 : Math.ceil(max),
    };
  }, [data]);

  const priceRange = useMemo<[number, number]>(() => {
    return userPriceRange || [absoluteMinPrice, absoluteMaxPrice];
  }, [userPriceRange, absoluteMinPrice, absoluteMaxPrice]);

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

  const epicMatchingSearch = useMemo(() => {
    return data?.epic.filter((game) =>
      game.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
    ) || [];
  }, [data, debouncedSearch]);

  const steamMatchingSearch = useMemo(() => {
    return data?.steam.filter((game) =>
      game.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
    ) || [];
  }, [data, debouncedSearch]);

  const filterCounts = useMemo(() => {
    return {
      all: epicMatchingSearch.length + steamMatchingSearch.length,
      epic_free: epicMatchingSearch.filter((game) => game.isFreeNow || game.isUpcomingFree).length,
      epic_discount: epicMatchingSearch.filter((game) => game.isDiscounted).length,
      steam_specials: steamMatchingSearch.filter((game) => game.isSpecial).length,
      steam_popular: steamMatchingSearch.filter((game) => game.isPopular).length,
      wishlist: epicMatchingSearch.filter((game) => wishlist.includes(game.id)).length +
                steamMatchingSearch.filter((game) => wishlist.includes(game.id)).length,
    };
  }, [epicMatchingSearch, steamMatchingSearch, wishlist]);

  const filteredEpic = useMemo(() => {
    return epicMatchingSearch.filter((game) => {
      if (activeFilter === 'wishlist') return wishlist.includes(game.id);
      if (activeFilter === 'epic_free') return game.isFreeNow || game.isUpcomingFree;
      if (activeFilter === 'epic_discount') return game.isDiscounted;
      if (activeFilter === 'all') return true;
      return false;
    });
  }, [epicMatchingSearch, activeFilter, wishlist]);

  const filteredSteam = useMemo(() => {
    return steamMatchingSearch.filter((game) => {
      if (activeFilter === 'wishlist') return wishlist.includes(game.id);
      if (activeFilter === 'steam_specials') return game.isSpecial;
      if (activeFilter === 'steam_popular') return game.isPopular;
      if (activeFilter === 'all') return true;
      return false;
    });
  }, [steamMatchingSearch, activeFilter, wishlist]);

  const priceFilteredEpic = useMemo(() => {
    return filteredEpic.filter((game) => {
      const price = game.isFreeNow ? 0 : game.discountPrice;
      return price >= priceRange[0] && price <= priceRange[1];
    });
  }, [filteredEpic, priceRange]);

  const priceFilteredSteam = useMemo(() => {
    return filteredSteam.filter((game) => {
      const price = game.discountPrice;
      return price >= priceRange[0] && price <= priceRange[1];
    });
  }, [filteredSteam, priceRange]);

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

      {data && activeFilter !== 'epic_free' && activeFilter !== 'wishlist' && (
        <PriceRangeFilter
          minPrice={absoluteMinPrice}
          maxPrice={absoluteMaxPrice}
          range={priceRange}
          onChange={setUserPriceRange}
          currency={data.epic[0]?.currency || data.steam[0]?.currency || 'UAH'}
        />
      )}

      <Suspense fallback={<div className="deals-grid"><Skeleton count={6} /></div>}>
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
                games={priceFilteredEpic}
                activeFilter={activeFilter}
                searchQuery={debouncedSearch}
                sortType={sortType}
              />
              <SteamSection
                games={priceFilteredSteam}
                activeFilter={activeFilter}
                searchQuery={debouncedSearch}
                sortType={sortType}
                nonGameIds={nonGameIds}
              />

              {activeFilter === 'all' &&
                priceFilteredEpic.length === 0 &&
                priceFilteredSteam.length === 0 &&
                !debouncedSearch && (
                  <div className="empty-state section-gap-top">
                    <h3>Немає доступних пропозицій</h3>
                    <p>Спробуйте змінити фільтри або зайдіть пізніше.</p>
                  </div>
                )}

              {activeFilter === 'wishlist' &&
                priceFilteredEpic.length === 0 &&
                priceFilteredSteam.length === 0 && (
                  <div className="empty-state section-gap-top">
                    <h3>Ваш список обраного порожній</h3>
                    <p>Додавайте ігри до обраного за допомогою сердечка на картках!</p>
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
      <DataProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={
            <Suspense fallback={<div className="empty-state loading-state" role="status"><RefreshCw size={40} className="spinner" /><h3>Завантаження...</h3></div>}>
              <HistoryPageWrapper />
            </Suspense>
          } />
        </Routes>
      </DataProvider>
    </HashRouter>
  );
}

function HistoryPageWrapper() {
  const { data, loading } = useData();

  return (
    <ErrorBoundary>
      <div style={{ padding: '24px 0' }}>
        <HistoryPageLazy data={data} loading={loading} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
