export interface EpicGame {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  currency: string;
  url: string;
  startDate: string;
  endDate: string;
  isFreeNow: boolean;
  isUpcomingFree: boolean;
  isDiscounted: boolean;
  discountPercent: number;
}

export interface SteamGame {
  id: string;
  title: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  currency: string;
  url: string;
  isSpecial: boolean;
  isPopular: boolean;
}

export interface NotifiedItem {
  title: string;
  price: number;
  percent: number;
  timestamp: string;
  type: 'free' | 'discount' | 'popular' | 'xbox_new';
}

export interface XboxGame {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  currency: string;
  url: string;
  isGamePass: boolean;
  isNewToGamePass: boolean;
  isComingSoon: boolean;
  isDiscounted: boolean;
}

export interface DealsData {
  lastUpdated: string;
  epic: EpicGame[];
  steam: SteamGame[];
  xbox: XboxGame[];
  notifiedHistory?: Record<string, NotifiedItem>;
}

export type FilterType = 'all' | 'epic_free' | 'epic_discount' | 'steam_specials' | 'steam_popular' | 'xbox_gamepass' | 'xbox_new' | 'xbox_discount' | 'wishlist';

export type SortType = 'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'discount-desc';
