import { lazy, useState, type FunctionComponent, Suspense, useMemo } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { Clock, RefreshCw, AlertCircle, History } from 'lucide-react';
import type { FilterType, SortType, EpicGame, SteamGame } from './types';
import { ErrorBoundaryWithLocale } from './components/ErrorBoundaryWithLocale';
import { TelegramBanner } from './components/TelegramBanner';
import { SearchControls } from './components/SearchControls';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { InstallPWA } from './components/InstallPWA';
import { PriceRangeFilter } from './components/PriceRangeFilter';
import { useDebounce } from './hooks/useDebounce';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DataProvider, useData } from './DataContext';
import { LocaleProvider, useLocale } from './contexts/LocaleContext';
import { WishlistProvider, useWishlist } from './contexts/WishlistContext';
import { formatLastUpdated, formatLastUpdatedEn, isSteamNonGame } from './utils';
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
  const { t, locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const sortValues = new Set<SortType>(['default','name-asc','name-desc','price-asc','price-desc','discount-desc']);
  const isValidSort = (v: unknown): v is SortType => typeof v === 'string' && sortValues.has(v as SortType);
  const [sortType, setSortType] = useLocalStorage<SortType>('sort-type', 'default', isValidSort);
  const { wishlist } = useWishlist();
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [userPriceRange, setUserPriceRange] = useState<[number, number] | null>(null);

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

  // A price filter is "active" only when the range is narrower than the full
  // span — not merely when userPriceRange is non-null (Reset sets it to the full
  // range), so the wishlist empty-state message stays correct after a reset.
  const isPriceFiltered = priceRange[0] > absoluteMinPrice || priceRange[1] < absoluteMaxPrice;

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
    // Count from the SAME price-filtered set the sections render, so the badge
    // numbers always match the visible cards.
    const inPriceRange = (price: number) => price >= priceRange[0] && price <= priceRange[1];
    const epicPriced = epicMatchingSearch.filter((g) => inPriceRange(g.isFreeNow ? 0 : g.discountPrice));
    const steamPriced = steamMatchingSearch.filter((g) => inPriceRange(g.discountPrice));
    return {
      all: epicPriced.length + steamPriced.length,
      epic_free: epicPriced.filter((game) => game.isFreeNow || game.isUpcomingFree).length,
      epic_discount: epicPriced.filter((game) => game.isDiscounted).length,
      steam_specials: steamPriced.filter((game) => game.isSpecial).length,
      steam_popular: steamPriced.filter((game) => game.isPopular).length,
      wishlist: epicPriced.filter((game) => wishlist.includes(game.id)).length +
                steamPriced.filter((game) => wishlist.includes(game.id)).length,
    };
  }, [epicMatchingSearch, steamMatchingSearch, wishlist, priceRange]);

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
                  {t.app.lastUpdated.split('{date}')[0]}
                  <b>{formatUpdate(data.lastUpdated)}</b>
                  {t.app.lastUpdated.split('{date}')[1]}
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

      {(activeFilter === 'all' || activeFilter === 'wishlist' || activeFilter === 'epic_discount' || activeFilter === 'steam_specials' || activeFilter === 'steam_popular') && (
        <PriceRangeFilter
          minPrice={absoluteMinPrice}
          maxPrice={absoluteMaxPrice}
          range={priceRange}
          onChange={setUserPriceRange}
          currency={data?.epic[0]?.currency || data?.steam[0]?.currency || 'UAH'}
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
                    <h3>{t.app.noDeals}</h3>
                    <p>{t.app.noDealsDesc}</p>
                  </div>
                )}

              {activeFilter === 'wishlist' &&
                priceFilteredEpic.length === 0 &&
                priceFilteredSteam.length === 0 && (
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
          {t.app.footerLink.split('{link}')[0]}
          <a
            href="https://github.com/ajjs1ajjs/Sales"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.app.viewOnGitHub}
          </a>
          {t.app.footerLink.split('{link}')[1] || '.'}
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
