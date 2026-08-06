import { useMemo, useState } from 'react';
import type { DealsData, EpicGame, FilterType, SortType, SteamGame, XboxGame } from '../types';
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
  priceFilteredEpic: EpicGame[];
  priceFilteredSteam: SteamGame[];
  priceFilteredXbox: XboxGame[];
}

export function useGameFilters(data: DealsData | null, wishlist: string[], searchQuery: string): GameFilters {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useLocalStorage<SortType>('sort-type', 'default', isValidSort);
  const [userPriceRange, setUserPriceRange] = useState<[number, number] | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const isXboxFilter = activeFilter === 'xbox_gamepass' || activeFilter === 'xbox_new' || activeFilter === 'xbox_discount';

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

    for (const g of data.xbox) {
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

  const xboxMatchingSearch = useMemo(() => {
    return data?.xbox.filter((game) =>
      game.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
    ) || [];
  }, [data, debouncedSearch]);

  const filterCounts = useMemo(() => {
    const inPriceRange = (price: number) => price >= priceRange[0] && price <= priceRange[1];
    const counts: Record<FilterType, number> = {
      all: 0, epic_free: 0, epic_discount: 0,
      steam_specials: 0, steam_popular: 0,
      xbox_gamepass: 0, xbox_new: 0, xbox_discount: 0, wishlist: 0,
    };

    for (const g of epicMatchingSearch) {
      const price = g.isFreeNow ? 0 : g.discountPrice;
      if (!inPriceRange(price)) continue;
      counts.all++;
      if (g.isFreeNow || g.isUpcomingFree) counts.epic_free++;
      if (g.isDiscounted) counts.epic_discount++;
      if (wishlist.includes(g.id)) counts.wishlist++;
    }

    for (const g of steamMatchingSearch) {
      const price = g.discountPrice;
      if (!inPriceRange(price)) continue;
      counts.all++;
      if (g.isSpecial) counts.steam_specials++;
      if (g.isPopular) counts.steam_popular++;
      if (wishlist.includes(g.id)) counts.wishlist++;
    }

    for (const g of xboxMatchingSearch) {
      const price = g.discountPrice;
      if (!inPriceRange(price)) continue;
      counts.all++;
      counts.xbox_gamepass++;
      if (g.isNewToGamePass || g.isComingSoon) counts.xbox_new++;
      if (g.isDiscounted) counts.xbox_discount++;
      if (wishlist.includes(g.id)) counts.wishlist++;
    }

    return counts;
  }, [epicMatchingSearch, steamMatchingSearch, xboxMatchingSearch, wishlist, priceRange]);

  const filteredEpic = useMemo(() => {
    return epicMatchingSearch.filter((game) => {
      if (isXboxFilter) return false;
      if (activeFilter === 'wishlist') return wishlist.includes(game.id);
      if (activeFilter === 'epic_free') return game.isFreeNow || game.isUpcomingFree;
      if (activeFilter === 'epic_discount') return game.isDiscounted;
      if (activeFilter === 'all') return true;
      return false;
    });
  }, [epicMatchingSearch, activeFilter, wishlist, isXboxFilter]);

  const filteredSteam = useMemo(() => {
    return steamMatchingSearch.filter((game) => {
      if (isXboxFilter) return false;
      if (activeFilter === 'wishlist') return wishlist.includes(game.id);
      if (activeFilter === 'steam_specials') return game.isSpecial;
      if (activeFilter === 'steam_popular') return game.isPopular;
      if (activeFilter === 'all') return true;
      return false;
    });
  }, [steamMatchingSearch, activeFilter, wishlist, isXboxFilter]);

  const filteredXbox = useMemo(() => {
    return xboxMatchingSearch.filter((game) => {
      if (activeFilter === 'wishlist') return wishlist.includes(game.id);
      if (activeFilter === 'xbox_gamepass' || activeFilter === 'xbox_new' || activeFilter === 'xbox_discount') return true;
      if (activeFilter === 'all') return true;
      return false;
    });
  }, [xboxMatchingSearch, activeFilter, wishlist]);

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

  const priceFilteredXbox = useMemo(() => {
    return filteredXbox.filter((game) => {
      const price = game.discountPrice;
      return price >= priceRange[0] && price <= priceRange[1];
    });
  }, [filteredXbox, priceRange]);

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
    priceFilteredEpic,
    priceFilteredSteam,
    priceFilteredXbox,
  };
}
