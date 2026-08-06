import { lazy, useState, type FunctionComponent, Suspense, Fragment } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { Clock, RefreshCw, AlertCircle, History } from 'lucide-react';
import type { FilterType, SortType, EpicGame, SteamGame, XboxGame } from './types';
import { ErrorBoundaryWithLocale } from './components/ErrorBoundaryWithLocale';
import { TelegramBanner } from './components/TelegramBanner';
import { SearchControls } from './components/SearchControls';
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

type SectionProps = {
  games: EpicGame[] | SteamGame[] | XboxGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
};

const EpicSection = lazy(() =>
  import('./components/EpicSection').then((m) => ({ default: m.EpicSection as FunctionComponent<SectionProps> })),
);
const SteamSection = lazy(() =>
  import('./components/SteamSection').then((m) => ({ default: m.SteamSection as FunctionComponent<SectionProps> })),
);
const XboxSection = lazy(() =>
  import('./components/XboxSection').then((m) => ({ default: m.XboxSection as FunctionComponent<SectionProps> })),
);
const HistoryPageLazy = lazy(() =>
  import('./components/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);

function HomePage() {
  const { data, loading, error } = useData();
  const { t, locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const { wishlist } = useWishlist();
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
    priceFilteredEpic,
    priceFilteredSteam,
    priceFilteredXbox,
  } = useGameFilters(data, wishlist, searchQuery);

  const isXboxFilter = activeFilter === 'xbox_gamepass' || activeFilter === 'xbox_new' || activeFilter === 'xbox_discount';

  const formatUpdate = locale === 'en' ? formatLastUpdatedEn : formatLastUpdated;
  const historyAria = locale === 'en' ? 'Notification history' : 'Історія сповіщень';

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
          </div>
          <div className="header-right">
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
        filterCounts={filterCounts}
        sortType={sortType}
        onSortChange={setSortType}
      />

      {(activeFilter === 'all' || activeFilter === 'wishlist' || activeFilter === 'epic_discount' || activeFilter === 'steam_specials' || activeFilter === 'steam_popular' || isXboxFilter) && (
        <PriceRangeFilter
          minPrice={absoluteMinPrice}
          maxPrice={absoluteMaxPrice}
          range={priceRange}
          onChange={setUserPriceRange}
          currency={data?.epic[0]?.currency || data?.steam[0]?.currency || data?.xbox[0]?.currency || 'UAH'}
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
              <EpicSection
                games={priceFilteredEpic}
                activeFilter={activeFilter}
                searchQuery={debouncedSearch}
                sortType={sortType}
              />
              <hr className="platform-separator" />
              <SteamSection
                games={priceFilteredSteam}
                activeFilter={activeFilter}
                searchQuery={debouncedSearch}
                sortType={sortType}
              />
              <hr className="platform-separator" />
              <XboxSection
                games={priceFilteredXbox}
                activeFilter={activeFilter}
                searchQuery={debouncedSearch}
                sortType={sortType}
              />

              {activeFilter === 'all' &&
                priceFilteredEpic.length === 0 &&
                priceFilteredSteam.length === 0 &&
                priceFilteredXbox.length === 0 &&
                !debouncedSearch && (
                  <div className="empty-state section-gap-top">
                    <h3>{t.app.noDeals}</h3>
                    <p>{t.app.noDealsDesc}</p>
                  </div>
                )}

              {activeFilter === 'wishlist' &&
                priceFilteredEpic.length === 0 &&
                priceFilteredSteam.length === 0 &&
                priceFilteredXbox.length === 0 && (
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

function App() {
  return (
    <HashRouter>
      <LocaleProvider>
        <WishlistProvider>
        <DataProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={
              <Suspense fallback={<div className="empty-state loading-state" role="status"><RefreshCw size={40} className="spinner" /><h3>Loading...</h3></div>}>
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

