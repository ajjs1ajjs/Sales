import { lazy, useState, useEffect, Suspense, Fragment } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { Clock, RefreshCw, AlertCircle, History } from 'lucide-react';
import type { FilterType, SortType, SteamGame, GamePassGame, PriceObservation } from './types';
import { ErrorBoundaryWithLocale } from './components/ErrorBoundaryWithLocale';
import { TelegramBanner } from './components/TelegramBanner';
import { SearchControls } from './components/SearchControls';
import { SearchEmptyState } from './components/SearchEmptyState';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { InstallPWA } from './components/InstallPWA';
import { PriceRangeFilter } from './components/PriceRangeFilter';
import { useGameFilters } from './hooks/useGameFilters';
import { DataProvider, useData } from './DataContext';
import { LocaleProvider, useLocale } from './contexts/LocaleContext';
import { WishlistProvider, useWishlist } from './contexts/WishlistContext';
import { formatLastUpdated, formatLastUpdatedEn, interp } from './utils';
import { Skeleton } from './components/Skeleton';
import { DataFreshness } from './components/DataFreshness';

type SectionProps = {
  games: SteamGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
  priceHistory?: Record<string, PriceObservation[]>;
};

type GamePassSectionProps = {
  games: GamePassGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
};

const SteamSection = lazy(() =>
  import('./components/SteamSection').then((m) => ({ default: m.SteamSection as React.FunctionComponent<SectionProps> })),
);
const GamePassSection = lazy(() =>
  import('./components/GamePassSection').then((m) => ({ default: m.GamePassSection as React.FunctionComponent<GamePassSectionProps> })),
);
const WishlistSection = lazy(() =>
  import('./components/WishlistSection').then((m) => ({ default: m.WishlistSection })),
);
const HistoryPageLazy = lazy(() =>
  import('./components/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);

function HomePage() {
  const { data, loading, refreshing, error, refreshError, lastFetchedAt, refresh } = useData();
  const { t, locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const { wishlist, saved, saveSnapshots } = useWishlist();
  useEffect(() => {
    if (!data) return;
    saveSnapshots([
      ...data.steam.map(game => ({ platform: 'steam' as const, game })),
      ...(data.gamepass ?? []).map(game => ({ platform: 'gamepass' as const, game })),
    ]);
  }, [data, saveSnapshots]);
  const {
    activeFilter,
    setActiveFilter,
    sortType,
    setSortType,
    debouncedSearch,
    priceRange,
    setUserPriceRange,
    isPriceFiltered,
    absoluteMinPrice,
    absoluteMaxPrice,
    filterCounts,
    priceFilteredSteam,
    gamepassGames,
  } = useGameFilters(data, wishlist, searchQuery);

  const catalogIds = new Set([...(data?.steam ?? []).map(g => g.id), ...(data?.gamepass ?? []).map(g => g.id)]);
  const missingIds = wishlist.filter(id => !catalogIds.has(id) && (saved[id]?.game.title ?? id).toLowerCase().includes(debouncedSearch.toLowerCase()));
  const counts = { ...filterCounts, wishlist: filterCounts.wishlist + missingIds.length };
  const formatUpdate = locale === 'en' ? formatLastUpdatedEn : formatLastUpdated;
  const historyAria = locale === 'en' ? 'Notification history' : 'Історія сповіщень';
  const steamVisible = priceFilteredSteam.length > 0;
  const gamepassVisible = gamepassGames.length > 0;

  return (
    <ErrorBoundaryWithLocale>
      <header>
        <div className="header-top">
          <div className="header-left" />
          <div className="header-center">
            <h1>{t.app.title}</h1>
            <p>{t.app.description}</p>
            {data?.lastUpdated && (
              <div className="last-updated">
                <Clock size={14} aria-hidden="true" />
                <span>
                  {interp(t.app.lastUpdated).map((part, i) =>
                    part.key === 'date'
                      ? <b key={i}>{formatUpdate(data.lastUpdated)}</b>
                      : <Fragment key={i}>{part.text}</Fragment>
                  )}
                </span>
              </div>
            )}
            <DataFreshness
              sourceUpdates={data?.sourceUpdates}
              refreshError={refreshError}
              lastFetchedAt={lastFetchedAt}
            />
          </div>
          <div className="header-right">
            <button
              type="button"
              className="header-btn"
              onClick={refresh}
              disabled={loading || refreshing}
              aria-label={refreshing ? t.app.refreshingData : t.app.refreshData}
              title={refreshing ? t.app.refreshingData : t.app.refreshData}
            >
              <RefreshCw size={18} className={refreshing ? 'spinner' : undefined} aria-hidden="true" />
            </button>
            <LanguageToggle />
            <ThemeToggle />
            <Link to="/history" className="header-btn history-nav-link" aria-label={historyAria}>
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
        filterCounts={counts}
        sortType={sortType}
        onSortChange={setSortType}
      />

      {(activeFilter === 'all' || activeFilter === 'wishlist' || activeFilter === 'steam_specials' || activeFilter === 'steam_popular') && (
        <PriceRangeFilter
          minPrice={absoluteMinPrice}
          maxPrice={absoluteMaxPrice}
          range={priceRange}
          onChange={setUserPriceRange}
          currency={data?.steam[0]?.currency || 'UAH'}
        />
      )}

      <Suspense fallback={<div className="deals-grid"><Skeleton count={6} /></div>}>
        <main>
          {loading && (
            <div className="empty-state loading-state" role="status" aria-live="polite">
              <RefreshCw size={40} className="spinner" aria-hidden="true" />
              <h3>{t.app.loading}</h3>
              <p>{t.app.loadingDesc}</p>
            </div>
          )}

          {error && (
            <div className="empty-state error-state" role="alert">
              <AlertCircle size={40} className="error-icon" aria-hidden="true" />
              <h3>{t.app.errorTitle}</h3>
              <p>{error}</p>
              <p className="error-hint">{t.app.errorHint}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {activeFilter === 'wishlist' ? (
                  <WishlistSection
                    steam={priceFilteredSteam}
                    gamepass={gamepassGames}
                    searchQuery={debouncedSearch}
                    sortType={sortType}
                    missingIds={missingIds}
                    priceHistory={data?.priceHistory}
                  />
              ) : (
                <>
                  <SteamSection
                    games={priceFilteredSteam}
                    activeFilter={activeFilter}
                    searchQuery={debouncedSearch}
                    sortType={sortType}
                    priceHistory={data?.priceHistory}
                  />
                  <GamePassSection
                    games={gamepassGames}
                    activeFilter={activeFilter}
                    searchQuery={debouncedSearch}
                    sortType={sortType}
                  />
                </>
              )}

              {activeFilter === 'all' && !steamVisible && !gamepassVisible && !debouncedSearch && (
                <div className="empty-state section-gap-top">
                  <h3>{t.app.noDeals}</h3>
                  <p>{t.app.noDealsDesc}</p>
                </div>
              )}

              {activeFilter === 'all' && !steamVisible && !gamepassVisible && debouncedSearch && (
                <SearchEmptyState
                  searchQuery={debouncedSearch}
                  onReset={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setUserPriceRange(null);
                  }}
                />
              )}

              {activeFilter === 'wishlist' && wishlist.length > 0 && !steamVisible && !gamepassVisible && missingIds.length === 0 && (
                <div className="empty-state section-gap-top">
                  <h3>{isPriceFiltered ? t.app.wishlistEmptyPrice : t.app.wishlistEmpty}</h3>
                  <p>{isPriceFiltered ? t.app.wishlistEmptyPriceDesc : t.app.wishlistEmptyDesc}</p>
                </div>
              )}
            </>
          )}
        </main>
      </Suspense>

      <footer>
        <p>{t.app.footer.replace('{year}', String(new Date().getFullYear()))}</p>
        <p>{t.app.footerSub}</p>
        <p className="footer-link">
          {interp(t.app.footerLink).map((part, i) =>
            part.key === 'link'
              ? <a key={i} href="https://github.com/ajjs1ajjs/Sales" target="_blank" rel="noopener noreferrer">{t.app.viewOnGitHub}</a>
              : <Fragment key={i}>{part.text}</Fragment>
          )}
        </p>
      </footer>
    </ErrorBoundaryWithLocale>
  );
}

function HistoryFallback() {
  const { t } = useLocale();
  return (
    <div className="empty-state loading-state" role="status">
      <RefreshCw size={40} className="spinner" aria-hidden="true" />
      <h3>{t.history.loading}</h3>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <LocaleProvider>
        <WishlistProvider>
        <DataProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={
              <Suspense fallback={<HistoryFallback />}>
                <HistoryPageWrapper />
              </Suspense>
            } />
          </Routes>
        </DataProvider>
        </WishlistProvider>
      </LocaleProvider>
    </HashRouter>
  );
}

function HistoryPageWrapper() {
  const { data, loading } = useData();

  return (
    <ErrorBoundaryWithLocale>
      <div style={{ padding: '24px 0' }}>
        <HistoryPageLazy data={data} loading={loading} />
      </div>
    </ErrorBoundaryWithLocale>
  );
}

export default App;
