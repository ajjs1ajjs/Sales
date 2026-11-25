import { Gamepad2, Globe, Heart, Monitor, Search, Tv, X } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import type { FilterType, PlatformTab, SortType } from '../types';
import { SortControls } from './SortControls';

interface Props {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  filterCounts?: Record<FilterType, number>;
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
}

interface FilterItem { filterKey: FilterType; label: string }

function getPlatformTab(filter: FilterType): PlatformTab {
  if (filter === 'wishlist') return 'wishlist';
  if (filter.startsWith('steam_')) return 'steam';
  if (filter.startsWith('gamepass_')) return 'gamepass';
  if (filter.startsWith('ps_')) return 'playstation';
  return 'all';
}

function FilterBtn({ filterKey, label, count, active, onClick }: FilterItem & { count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      key={filterKey}
      onClick={onClick}
      className={`filter-btn filter-btn--sm${active ? ' active' : ''}`}
      aria-pressed={active}
      type="button"
    >
      {label}
      {count !== undefined && <span className="filter-count"> ({count})</span>}
    </button>
  );
}

export function SearchControls({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
  sortType,
  onSortChange,
}: Props) {
  const { t } = useLocale();
  const activeTab = getPlatformTab(activeFilter);

  const platformTabs: { tab: PlatformTab; filterKey: FilterType; label: string; icon: React.ReactNode }[] = [
    { tab: 'all', filterKey: 'all', label: t.filters.all, icon: <Globe size={16} aria-hidden="true" /> },
    { tab: 'steam', filterKey: 'steam_all', label: t.filters.tabSteam, icon: <Monitor size={16} aria-hidden="true" /> },
    { tab: 'gamepass', filterKey: 'gamepass_all', label: t.filters.tabGamePass, icon: <Gamepad2 size={16} aria-hidden="true" /> },
    { tab: 'playstation', filterKey: 'ps_all', label: t.filters.tabPlayStation, icon: <Tv size={16} aria-hidden="true" /> },
    { tab: 'wishlist', filterKey: 'wishlist', label: t.filters.wishlist, icon: <Heart size={16} aria-hidden="true" /> },
  ];

  const subFiltersByTab: Record<PlatformTab, FilterItem[]> = {
    all: [
      { filterKey: 'steam_specials', label: t.filters.steamSpecials },
      { filterKey: 'steam_dlc', label: t.filters.steamDlc },
      { filterKey: 'gamepass_new', label: t.filters.gamepassNew },
      { filterKey: 'gamepass_deals', label: t.filters.gamepassDeals },
      { filterKey: 'ps_deals', label: t.filters.psDeals },
      { filterKey: 'ps_essential', label: t.filters.psEssential },
      { filterKey: 'ps_extra', label: t.filters.psExtra },
    ],
    steam: [
      { filterKey: 'steam_all', label: t.filters.steamAll },
      { filterKey: 'steam_free', label: t.filters.steamFree },
      { filterKey: 'steam_specials', label: t.filters.steamSpecials },
      { filterKey: 'steam_popular', label: t.filters.steamPopular },
      { filterKey: 'steam_dlc', label: t.filters.steamDlc },
    ],
    gamepass: [
      { filterKey: 'gamepass_all', label: t.filters.gamepassAll },
      { filterKey: 'gamepass_new', label: t.filters.gamepassNew },
      { filterKey: 'gamepass_popular', label: t.filters.gamepassPopular },
      { filterKey: 'gamepass_deals', label: t.filters.gamepassDeals },
    ],
    playstation: [
      { filterKey: 'ps_all', label: t.filters.psAll },
      { filterKey: 'ps_essential', label: t.filters.psEssential },
      { filterKey: 'ps_extra', label: t.filters.psExtra },
      { filterKey: 'ps_deals', label: t.filters.psDeals },
      { filterKey: 'ps_popular', label: t.filters.psPopular },
    ],
    wishlist: [],
  };

  const subFilters = subFiltersByTab[activeTab];

  return (
    <section className="controls-container" aria-label={t.filters.controlsAria}>
      <div className="controls-top">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <label htmlFor="search-games" className="visually-hidden">
            {t.app.searchLabel}
          </label>
          <input
            type="text"
            id="search-games"
            placeholder={t.app.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
              aria-label={t.app.clearSearch}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <SortControls sortType={sortType} onSortChange={onSortChange} />
      </div>

      <div className="platform-tabs" role="group" aria-label={t.filters.platformsAria}>
        {platformTabs.map(({ tab, filterKey, label, icon }) => {
          const isActive = activeTab === tab;
          const count = filterCounts?.[filterKey];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onFilterChange(filterKey)}
              className={`platform-tab platform-tab--${tab}${isActive ? ' active' : ''}`}
              aria-pressed={isActive}
            >
              {icon}
              <span>{label}</span>
              {count !== undefined && <span className="filter-count"> ({count})</span>}
            </button>
          );
        })}
      </div>

      {subFilters.length > 0 && (
        <div className="subfilter-row" role="group" aria-label={t.filters.subfiltersAria}>
          {subFilters.map((filter) => (
            <FilterBtn
              key={filter.filterKey}
              filterKey={filter.filterKey}
              label={filter.label}
              count={filterCounts?.[filter.filterKey]}
              active={activeFilter === filter.filterKey}
              onClick={() => onFilterChange(filter.filterKey)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
