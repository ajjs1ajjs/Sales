/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface WishlistContextValue {
  wishlist: string[];
  toggleWishlist: (gameId: string) => void;
  isWishlisted: (gameId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useLocalStorage<string[]>('wishlist', [], isStringArray);

  const toggleWishlist = useCallback((gameId: string) => {
    setWishlist((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId],
    );
  }, [setWishlist]);

  const isWishlisted = useCallback((gameId: string) => {
    return wishlist.includes(gameId);
  }, [wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
