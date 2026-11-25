import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { WishlistProvider } from '../../contexts/WishlistContext';
import { GameCard } from '../GameCard';
import type { GamePassGame, PlayStationGame, SteamGame } from '../../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider initialLocale="uk">
      <WishlistProvider>{children}</WishlistProvider>
    </LocaleProvider>
  );
}

const mockSteamFreeGame: SteamGame = {
  id: '123',
  title: 'Test Steam Free Game',
  imageUrl: 'https://example.com/steam.jpg',
  originalPrice: 29.99,
  discountPrice: 0,
  discountPercent: 100,
  currency: 'UAH',
  url: 'https://store.steampowered.com/app/123',
  isSpecial: false,
  isFree: true,
  isPopular: false,
};

const mockSteamGame: SteamGame = {
  id: 'steam-1',
  title: 'Test Steam Game',
  imageUrl: 'https://example.com/steam.jpg',
  originalPrice: 29.99,
  discountPrice: 14.99,
  discountPercent: 50,
  currency: 'UAH',
  url: 'https://store.steampowered.com/app/1',
  isSpecial: true,
  isFree: false,
  isPopular: false,
};

describe('GameCard', () => {
  it('renders Steam free game', () => {
    render(<GameCard game={mockSteamFreeGame} platform="steam" badge="FREE" badgeVariant="free" linkText="Придбати" />, { wrapper: Wrapper });
    expect(screen.getByText('Test Steam Free Game')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('БЕЗКОШТОВНО')).toBeInTheDocument();
    expect(screen.getByText('Придбати')).toBeInTheDocument();
  });

  it('renders Steam discount game', () => {
    render(<GameCard game={mockSteamGame} platform="steam" badge="-50%" showTagDescription />, { wrapper: Wrapper });
    expect(screen.getByText('Test Steam Game')).toBeInTheDocument();
    expect(screen.getByText('-50%')).toBeInTheDocument();
    expect(screen.getByText('Придбати')).toBeInTheDocument();
  });

  it('renders platform badges', () => {
    render(<GameCard game={mockSteamGame} platform="steam" />, { wrapper: Wrapper });
    expect(screen.getByText('Steam')).toBeInTheDocument();
  });

  it('shows current price', () => {
    render(<GameCard game={mockSteamGame} platform="steam" />, { wrapper: Wrapper });
    expect(screen.getByText('14,99 грн')).toBeInTheDocument();
  });

  it('shows original price with strikethrough', () => {
    render(<GameCard game={mockSteamGame} platform="steam" />, { wrapper: Wrapper });
    const originalPrice = screen.getByText('29,99 грн');
    expect(originalPrice).toBeInTheDocument();
    expect(originalPrice.className).toContain('price-original');
  });

  it('renders link with correct href', () => {
    render(<GameCard game={mockSteamFreeGame} platform="steam" linkText="Придбати" />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /придбати/i });
    expect(link).toHaveAttribute('href', mockSteamFreeGame.url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders wishlist button', () => {
    render(<GameCard game={mockSteamGame} platform="steam" />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /додати.*в обране/i })).toBeInTheDocument();
  });

  describe('Game Pass cards', () => {
    const mockGamePassGame: GamePassGame = {
      id: '9PB301R051CQ',
      title: 'Test Game Pass Game',
      imageUrl: 'https://store-images.s-microsoft.com/image/test.jpg',
      url: 'https://www.xbox.com/uk-UA/games/store/test-game/9PB301R051CQ',
      isNew: true,
      isPopular: true,
    };

    it('renders subscription label instead of price', () => {
      render(<GameCard game={mockGamePassGame} platform="gamepass" badge="НОВЕ" />, { wrapper: Wrapper });
      expect(screen.getByText('Test Game Pass Game')).toBeInTheDocument();
      expect(screen.getByText('НОВЕ')).toBeInTheDocument();
      expect(screen.getByText('Включено у Game Pass')).toBeInTheDocument();
      expect(screen.queryByText(/грн/)).not.toBeInTheDocument();
    });

    it('renders Game Pass platform badge and store link', () => {
      render(<GameCard game={mockGamePassGame} platform="gamepass" />, { wrapper: Wrapper });
      expect(screen.getByText('Game Pass')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /детальніше/i });
      expect(link).toHaveAttribute('href', mockGamePassGame.url);
    });

    it('renders discounted Game Pass card with price and subscription pill', () => {
      const discountedGp: GamePassGame = {
        ...mockGamePassGame,
        originalPrice: 1540,
        discountPrice: 616,
        discountPercent: 60,
        currency: 'UAH',
        isDeal: true,
      };
      render(<GameCard game={discountedGp} platform="gamepass" badge="-60%" showTagDescription />, { wrapper: Wrapper });
      expect(screen.getByText('-60%')).toBeInTheDocument();
      expect(screen.getByText('Включено у Game Pass')).toBeInTheDocument();
      expect(screen.getByText(/616\s*грн/)).toBeInTheDocument();
      expect(screen.getByText(/1\s*540\s*грн/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /у xbox store/i })).toBeInTheDocument();
    });
  });

  describe('Steam meta & PlayStation cards', () => {
    it('renders Steam review rating, DLC chip, and lowest price badge', () => {
      const dlcGame: SteamGame = {
        ...mockSteamGame,
        id: '2138330',
        isDlc: true,
        reviewPercent: 89,
        reviewCount: 22826,
      };
      render(<GameCard game={dlcGame} platform="steam" badge="-30%" badgeVariant="dlc" isLowestPrice />, { wrapper: Wrapper });
      expect(screen.getByText('DLC')).toBeInTheDocument();
      expect(screen.getByText(/89% · 23K/)).toBeInTheDocument();
      expect(screen.getByText('Мін. ціна')).toBeInTheDocument();
    });

    it('renders PlayStation 5 deal and PS Plus subscription cards', () => {
      const psDeal: PlayStationGame = {
        id: 'EP0006-PPSA23566_00-BASEUFC6GAME0000',
        title: 'UFC 6',
        imageUrl: 'https://example.com/ufc6.jpg',
        url: 'https://store.playstation.com/uk-ua/product/EP0006-PPSA23566_00-BASEUFC6GAME0000',
        originalPrice: 2599,
        discountPrice: 1559.4,
        discountPercent: 40,
        currency: 'UAH',
        isDeal: true,
        isPopular: true,
        isPsPlusExclusive: true,
      };
      render(<GameCard game={psDeal} platform="playstation" badge="-40%" />, { wrapper: Wrapper });
      expect(screen.getByText('PlayStation 5')).toBeInTheDocument();
      expect(screen.getByText('Додатково з PS+')).toBeInTheDocument();
      expect(screen.getByText(/1\s*559,4\s*грн/)).toBeInTheDocument();
    });
  });
});
