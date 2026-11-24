import { useCallback, useMemo, useState } from 'react';
import type { DealsData, FilterType, GamePassGame, PlayStationGame, SortType, SteamGame } from '../types';
import { useDebounce } from './useDebounce';
import { useLocalStorage } from './useLocalStorage';

const SORT_VALUES = new Set<SortType>(['default', 'name-asc', 'name-desc', 'price-asc', 'price-desc', 'discount-desc']);

const isValidSort = (v: unknown): v is SortType => typeof v === 'string' && SORT_VALUES.has(v as SortType);

export interface GameFilters {
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
  sortType: SortType;
  setSortType: (sort: SortType) => void;
  debouncedSearch: string;
  priceRange: [number, number];
  setUserPriceRange: (range: [number, number] | null) => void;
  isPriceFiltered: boolean;
  absoluteMinPrice: number;
  absoluteMaxPrice: number;
  filterCounts: Record<FilterType, number>;
  priceFilteredSteam: SteamGame[];
  /** Game Pass-ігри після поточного фільтра й пошуку (ціновий фільтр не діє — у них немає ціни). */
  gamepassGames: GamePassGame[];
  /** PlayStation 5 ігри та пропозиції PS Plus після поточного фільтра, пошуку й діапазону цін. */
  priceFilteredPlayStation: PlayStationGame[];
}

export function useGameFilters(data: DealsData | null, wishlist: string[], searchQuery: string): GameFilters {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useLocalStorage<SortType>('sort-type', 'default', isValidSort);
  const [userPriceRange, setUserPriceRangeState] = useState<[number, number] | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const { absoluteMinPrice, absoluteMaxPrice } = useMemo(() => {
    if (!data) return { absoluteMinPrice: 0, absoluteMaxPrice: 10000 };
    let min = Infinity;
    let max = -Infinity;

    for (const g of data.steam) {
      const price = g.discountPrice;
      if (price < min) min = price;
      if (price > max) max = price;
    }

    for (const g of data.playstation ?? []) {
      if (typeof g.discountPrice === 'number' && Number.isFinite(g.discountPrice)) {
        if (g.discountPrice < min) min = g.discountPrice;
        if (g.discountPrice > max) max = g.discountPrice;
      }
    }

    return {
      absoluteMinPrice: min === Infinity ? 0 : Math.floor(min),
      absoluteMaxPrice: max === -Infinity ? 10000 : Math.ceil(max),
    };
  }, [data]);

  // Normalize full-span resets back to null so background catalog refreshes
  // expand naturally instead of clamping to an older max price.
  const setUserPriceRange = useCallback(
    (range: [number, number] | null) => {
      if (!range || (range[0] <= absoluteMinPrice && range[1] >= absoluteMaxPrice)) {
        setUserPriceRangeState(null);
      } else {
        setUserPriceRangeState(range);
      }
    },
    [absoluteMinPrice, absoluteMaxPrice],
  );

  const priceRange: [number, number] = useMemo(
    () => userPriceRange ?? [absoluteMinPrice, absoluteMaxPrice],
    [userPriceRange, absoluteMinPrice, absoluteMaxPrice],
  );

  const isPriceFiltered = priceRange[0] > absoluteMinPrice || priceRange[1] < absoluteMaxPrice;

  const steamMatchingSearch = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return data?.steam.filter((game) => game.title.toLowerCase().includes(q)) || [];
  }, [data, debouncedSearch]);

  const gamepassMatchingSearch = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return (data?.gamepass ?? []).filter((game) => game.title.toLowerCase().includes(q));
  }, [data, debouncedSearch]);

  const psMatchingSearch = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return (data?.playstation ?? []).filter((game) => game.title.toLowerCase().includes(q));
  }, [data, debouncedSearch]);

  const filterCounts = useMemo(() => {
    const inPriceRange = (price: number) => price >= priceRange[0] && price <= priceRange[1];
    const counts: Record<FilterType, number> = {
      all: 0,
      steam_all: 0,
      steam_free: 0,
      steam_specials: 0,
      steam_popular: 0,
      steam_dlc: 0,
      gamepass_all: 0,
      gamepass_new: 0,
      gamepass_popular: 0,
      ps_all: 0,
      ps_essential: 0,
      ps_extra: 0,
      ps_deals: 0,
      ps_popular: 0,
      wishlist: 0,
    };

    for (const g of steamMatchingSearch) {
      if (!inPriceRange(g.discountPrice)) continue;
      if (!g.isFree && !g.isSpecial && !g.isPopular) {
        if (wishlistSet.has(g.id)) counts.wishlist++;
        continue;
      }
      counts.all++;
      counts.steam_all++;
      if (g.isFree) counts.steam_free++;
      else if (g.isDlc && g.isSpecial) counts.steam_dlc++;
      else if (g.isSpecial) counts.steam_specials++;
      if (g.isPopular && !g.isDlc) counts.steam_popular++;
      if (wishlistSet.has(g.id)) counts.wishlist++;
    }

    counts.all += gamepassMatchingSearch.length;
    counts.gamepass_all = gamepassMatchingSearch.length;
    for (const g of gamepassMatchingSearch) {
      if (g.isNew) counts.gamepass_new++;
      if (g.isPopular) counts.gamepass_popular++;
      if (wishlistSet.has(g.id)) counts.wishlist++;
    }

    for (const g of psMatchingSearch) {
      const hasPrice = typeof g.discountPrice === 'number';
      if (hasPrice && !inPriceRange(g.discountPrice!)) continue;
      if (!hasPrice && isPriceFiltered) continue;
      counts.all++;
      counts.ps_all++;
      if (g.psPlusTier === 'essential') counts.ps_essential++;
      if (g.psPlusTier === 'extra') counts.ps_extra++;
      if (g.isDeal) counts.ps_deals++;
      if (g.isPopular) counts.ps_popular++;
      if (wishlistSet.has(g.id)) counts.wishlist++;
    }

    return counts;
  }, [steamMatchingSearch, gamepassMatchingSearch, psMatchingSearch, wishlistSet, priceRange, isPriceFiltered]);

  const filteredSteam = useMemo(() => {
    return steamMatchingSearch.filter((game) => {
      if (activeFilter === 'wishlist') return wishlistSet.has(game.id);
      if (activeFilter === 'steam_free') return game.isFree;
      if (activeFilter === 'steam_dlc') return Boolean(game.isDlc) && (game.isSpecial || game.isFree);
      if (activeFilter === 'steam_specials') return game.isSpecial && !game.isFree && !game.isDlc;
      if (activeFilter === 'steam_popular') return game.isPopular && !game.isDlc;
      if (activeFilter === 'all' || activeFilter === 'steam_all') return true;
      return false;
    });
  }, [steamMatchingSearch, activeFilter, wishlistSet]);

  const priceFilteredSteam = useMemo(() => {
    return filteredSteam.filter((game) => {
      const price = game.discountPrice;
      return price >= priceRange[0] && price <= priceRange[1];
    });
  }, [filteredSteam, priceRange]);

  const gamepassGames = useMemo(() => {
    switch (activeFilter) {
      case 'gamepass_new':
        return gamepassMatchingSearch.filter((g) => g.isNew);
      case 'gamepass_popular':
        return gamepassMatchingSearch.filter((g) => g.isPopular);
      case 'wishlist':
        return gamepassMatchingSearch.filter((g) => wishlistSet.has(g.id));
      case 'all':
      case 'gamepass_all':
        return gamepassMatchingSearch;
      default:
        return [];
    }
  }, [gamepassMatchingSearch, activeFilter, wishlistSet]);

  const priceFilteredPlayStation = useMemo(() => {
    return psMatchingSearch.filter((game) => {
      const matchesFilter = (() => {
        switch (activeFilter) {
          case 'ps_essential':
            return game.psPlusTier === 'essential';
          case 'ps_extra':
            return game.psPlusTier === 'extra';
          case 'ps_deals':
            return game.isDeal;
          case 'ps_popular':
            return game.isPopular;
          case 'wishlist':
            return wishlistSet.has(game.id);
          case 'all':
          case 'ps_all':
            return true;
          default:
            return false;
        }
      })();
      if (!matchesFilter) return false;
      if (typeof game.discountPrice === 'number') {
        return game.discountPrice >= priceRange[0] && game.discountPrice <= priceRange[1];
      }
      return !isPriceFiltered;
    });
  }, [psMatchingSearch, activeFilter, wishlistSet, priceRange, isPriceFiltered]);

  return {
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
    priceFilteredPlayStation,
  };
}
