import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { GameCard } from '../GameCard';
import type { EpicGame, SteamGame } from '../../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

const mockEpicGame: EpicGame = {
  id: 'epic-1',
  title: 'Test Epic Game',
  description: 'An awesome free game',
  imageUrl: 'https://example.com/img.jpg',
  originalPrice: 59.99,
  discountPrice: 0,
  currency: 'USD',
  url: 'https://store.epicgames.com/p/test',
  startDate: '',
  endDate: '2026-06-01T00:00:00Z',
  isFreeNow: true,
  isUpcomingFree: false,
  isDiscounted: false,
  discountPercent: 0,
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
  isPopular: false,
};

describe('GameCard', () => {
  it('renders Epic free game', () => {
    render(<GameCard game={mockEpicGame} platform="epic" badge="FREE" badgeVariant="free" linkText="Забрати" />, { wrapper: Wrapper });
    expect(screen.getByText('Test Epic Game')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('БЕЗКОШТОВНО')).toBeInTheDocument();
    expect(screen.getByText('Забрати')).toBeInTheDocument();
  });

  it('renders Steam discount game', () => {
    render(<GameCard game={mockSteamGame} platform="steam" badge="-50%" showTagDescription />, { wrapper: Wrapper });
    expect(screen.getByText('Test Steam Game')).toBeInTheDocument();
    expect(screen.getByText('-50%')).toBeInTheDocument();
    expect(screen.getByText('Придбати')).toBeInTheDocument();
  });

  it('renders platform badges', () => {
    const { rerender } = render(<GameCard game={mockEpicGame} platform="epic" />, { wrapper: Wrapper });
    expect(screen.getByText('Epic Games')).toBeInTheDocument();

    rerender(<GameCard game={mockSteamGame} platform="steam" />);
    expect(screen.getByText('Steam')).toBeInTheDocument();
  });

  it('shows current price', () => {
    render(<GameCard game={mockSteamGame} platform="steam" />, { wrapper: Wrapper });
    expect(screen.getByText('14.99 грн')).toBeInTheDocument();
  });

  it('shows original price with strikethrough', () => {
    render(<GameCard game={mockSteamGame} platform="steam" />, { wrapper: Wrapper });
    const originalPrice = screen.getByText('29.99 грн');
    expect(originalPrice).toBeInTheDocument();
    expect(originalPrice.className).toContain('price-original');
  });

  it('renders link with correct href', () => {
    render(<GameCard game={mockEpicGame} platform="epic" linkText="Забрати" />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /забрати/i });
    expect(link).toHaveAttribute('href', mockEpicGame.url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders wishlist button', () => {
    render(<GameCard game={mockEpicGame} platform="epic" />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /додати.*в обране/i })).toBeInTheDocument();
  });
});
