import { Heart } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  gameId: string;
  title: string;
}

export function WishlistButton({ gameId, title }: Props) {
  const { t } = useLocale();
  const [wishlist, setWishlist] = useLocalStorage<string[]>('wishlist', []);
  const isWishlisted = wishlist.includes(gameId);

  const toggle = () => {
    setWishlist((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId],
    );
  };

  return (
    <button
      type="button"
      className={`wishlist-btn${isWishlisted ? ' wishlist-btn--active' : ''}`}
      onClick={toggle}
      aria-label={isWishlisted ? t.wishlist.remove.replace('{title}', title) : t.wishlist.add.replace('{title}', title)}
      title={isWishlisted ? t.wishlist.removeTooltip : t.wishlist.addTooltip}
    >
      <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
    </button>
  );
}
