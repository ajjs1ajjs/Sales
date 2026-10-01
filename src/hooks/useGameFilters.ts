import { useMemo, useState } from 'react';
import type { DealsData, FilterType, SortType, SteamGame } from '../types';
import { useDebounce } from './useDebounce';
import { useLocalStorage } from './useLocalStorage';

const SORT_VALUES = new Set<SortType>(['default','name-asc','name-desc','price-asc','price-desc','discount-desc']);

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
}

export function useGameFilters(data: DealsData | null, wishlist: string[], searchQuery: string): GameFilters {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useLocalStorage<SortType>('sort-type', 'default', isValidSort);
  const [userPriceRange, setUserPriceRange] = useState<[number, number] | null>(null);
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

    return {
      absoluteMinPrice: min === Infinity ? 0 : Math.floor(min),
      absoluteMaxPrice: max === -Infinity ? 10000 : Math.ceil(max),
    };
  }, [data]);

  const priceRange: [number, number] = useMemo(
    () => userPriceRange ?? [absoluteMinPrice, absoluteMaxPrice],
    [userPriceRange, absoluteMinPrice, absoluteMaxPrice],
  );

  // A price filter is "active" only when the range is narrower than the full
  // span — not merely when userPriceRange is non-null (Reset sets it to the full
  // range), so the wishlist empty-state message stays correct after a reset.
  const isPriceFiltered = priceRange[0] > absoluteMinPrice || priceRange[1] < absoluteMaxPrice;

  const steamMatchingSearch = useMemo(() => {
    return data?.steam.filter((game) =>
      game.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
    ) || [];
  }, [data, debouncedSearch]);

  const filterCounts = useMemo(() => {
    const inPriceRange = (price: number) => price >= priceRange[0] && price <= priceRange[1];
    const counts: Record<FilterType, number> = {
      all: 0,
      steam_free: 0, steam_specials: 0, steam_popular: 0,
      wishlist: 0,
    };

    for (const g of steamMatchingSearch) {
      const price = g.discountPrice;
      if (!inPriceRange(price)) continue;
      if (!g.isFree && !g.isSpecial && !g.isPopular) {
        if (wishlistSet.has(g.id)) counts.wishlist++;
        continue;
      }
      counts.all++;
      if (g.isFree) counts.steam_free++;
      if (g.isSpecial) counts.steam_specials++;
      if (g.isPopular) counts.steam_popular++;
      if (wishlistSet.has(g.id)) counts.wishlist++;
    }

    return counts;
  }, [steamMatchingSearch, wishlistSet, priceRange]);

  const filteredSteam = useMemo(() => {
    return steamMatchingSearch.filter((game) => {
      if (activeFilter === 'wishlist') return wishlistSet.has(game.id);
      if (activeFilter === 'steam_free') return game.isFree;
      if (activeFilter === 'steam_specials') return game.isSpecial;
      if (activeFilter === 'steam_popular') return game.isPopular;
      if (activeFilter === 'all') return true;
      return false;
    });
  }, [steamMatchingSearch, activeFilter, wishlistSet]);

  const priceFilteredSteam = useMemo(() => {
    return filteredSteam.filter((game) => {
      const price = game.discountPrice;
      return price >= priceRange[0] && price <= priceRange[1];
    });
  }, [filteredSteam, priceRange]);

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
  };
}
