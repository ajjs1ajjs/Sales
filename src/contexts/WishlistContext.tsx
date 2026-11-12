/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SteamGame, GamePassGame } from '../types';

export type SavedGame = { platform: 'steam' | 'gamepass'; game: SteamGame | GamePassGame };
export type PriceTarget = { amount: number; currency: string };
const EMPTY_SAVED: Record<string, SavedGame> = {};
const EMPTY_TARGETS: Record<string, PriceTarget> = {};
const isPriceTargets = (v: unknown): v is Record<string, PriceTarget> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([id, value]) => /^\d+$/.test(id) && !!value && typeof value === 'object' && typeof (value as PriceTarget).amount === 'number' && Number.isFinite((value as PriceTarget).amount) && (value as PriceTarget).amount >= 0 && typeof (value as PriceTarget).currency === 'string' && /^[A-Z]{3}$/.test((value as PriceTarget).currency));
const isSavedGames = (v: unknown): v is Record<string, SavedGame> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([id, value]) => {
  if (!value || typeof value !== 'object') return false;
  const item = value as SavedGame;
  return (item.platform === 'steam' || item.platform === 'gamepass') && !!item.game && item.game.id === id && typeof item.game.title === 'string' && typeof item.game.url === 'string' && typeof item.game.imageUrl === 'string';
});

interface WishlistContextValue {
  wishlist: string[];
  toggleWishlist: (gameId: string) => void;
  isWishlisted: (gameId: string) => boolean;
  saved: Record<string, SavedGame>;
  saveSnapshots: (games: SavedGame[]) => void;
  importWishlist: (value: unknown) => boolean;
  targets: Record<string, PriceTarget>;
  setTarget: (id: string, target: PriceTarget | null) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

const EMPTY_WISHLIST: string[] = [];

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useLocalStorage<string[]>('wishlist', EMPTY_WISHLIST, isStringArray);
  const [saved, setSaved] = useLocalStorage<Record<string, SavedGame>>('wishlist-snapshots', EMPTY_SAVED, isSavedGames);
  const [targets, setTargets] = useLocalStorage<Record<string, PriceTarget>>('wishlist-price-targets', EMPTY_TARGETS, isPriceTargets);
  const setTarget = useCallback((id: string, target: PriceTarget | null) => {
    setTargets(prev => {
      const next = { ...prev };
      if (target === null) delete next[id];
      else if (isPriceTargets({ [id]: target })) next[id] = target;
      return next;
    });
  }, [setTargets]);

  const saveSnapshots = useCallback((games: SavedGame[]) => {
    setSaved(prev => {
      const next = { ...prev };
      for (const item of games) if (wishlist.includes(item.game.id)) next[item.game.id] = item;
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [setSaved, wishlist]);
  const importWishlist = useCallback((value: unknown) => {
    if (!value || typeof value !== 'object') return false;
    const data = value as { version?: unknown; ids?: unknown; saved?: unknown; targets?: unknown };
    if (data.version !== 1 || !isStringArray(data.ids) || !isSavedGames(data.saved) || (data.targets !== undefined && !isPriceTargets(data.targets))) return false;
    const ids = data.ids;
    const snapshots = data.saved;
    setWishlist(prev => [...new Set([...prev, ...ids])]);
    setSaved(prev => ({ ...snapshots, ...prev }));
    if (data.targets) {
      const importedTargets = data.targets as Record<string, PriceTarget>;
      setTargets(prev => ({ ...importedTargets, ...prev }));
    }
    return true;
  }, [setWishlist, setSaved, setTargets]);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const toggleWishlist = useCallback((gameId: string) => {
    setWishlist((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId],
    );
  }, [setWishlist]);

  const isWishlisted = useCallback((gameId: string) => {
    return wishlistSet.has(gameId);
  }, [wishlistSet]);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted, saved, saveSnapshots, importWishlist, targets, setTarget }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
