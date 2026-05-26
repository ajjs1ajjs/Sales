import { Heart } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  gameId: string;
  title: string;
}

export function WishlistButton({ gameId, title }: Props) {
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
      aria-label={isWishlisted ? `Видалити ${title} з обраного` : `Додати ${title} в обране`}
      title={isWishlisted ? 'Видалити з обраного' : 'Додати в обране'}
    >
      <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
    </button>
  );
}
