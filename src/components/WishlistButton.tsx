import { Heart } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useWishlist } from '../contexts/WishlistContext';

interface Props {
  gameId: string;
  title: string;
}

export function WishlistButton({ gameId, title }: Props) {
  const { t } = useLocale();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const active = isWishlisted(gameId);

  return (
    <button
      type="button"
      className={`wishlist-btn${active ? ' wishlist-btn--active' : ''}`}
      onClick={() => toggleWishlist(gameId)}
      aria-label={active ? t.wishlist.remove.replace('{title}', title) : t.wishlist.add.replace('{title}', title)}
      title={active ? t.wishlist.removeTooltip : t.wishlist.addTooltip}
    >
      <Heart size={16} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
