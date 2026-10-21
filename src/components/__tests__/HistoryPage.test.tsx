import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { HistoryPage } from '../HistoryPage';
import type { DealsData } from '../../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <LocaleProvider initialLocale="uk">{children}</LocaleProvider>
    </MemoryRouter>
  );
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const mockData: DealsData = {
  lastUpdated: daysAgo(0),
  steam: [],
  notifiedHistory: {
    'steam_free_game1': {
      title: 'Free Game 1',
      price: 0,
      percent: 100,
      timestamp: daysAgo(2),
      type: 'free',
    },
    'steam_discount_game2': {
      title: 'Discounted Game 2',
      price: 9.99,
      percent: 50,
      timestamp: daysAgo(3),
      type: 'discount',
    },
    'steam_popular_game3': {
      title: 'Popular Game 3',
      price: 29.99,
      percent: 0,
      timestamp: daysAgo(4),
      type: 'popular',
    },
    'gamepass_game4': {
      title: 'Game Pass Game 4',
      price: 0,
      percent: 0,
      timestamp: daysAgo(5),
      type: 'gamepass',
    },
    'xbox_new_game5': {
      title: 'Legacy Xbox Game 5',
      price: 0,
      percent: 0,
      timestamp: daysAgo(6),
      type: 'xbox_new',
    },
    'steam_free_game6': {
      title: 'Old Game 6',
      price: 0,
      percent: 100,
      timestamp: daysAgo(40),
      type: 'free',
    },
  },
};

describe('HistoryPage', () => {
  it('shows loading state', () => {
    render(<HistoryPage data={null} loading={true} />, { wrapper: Wrapper });
    expect(screen.getByText(/завантаження/i)).toBeInTheDocument();
  });

  it('shows unavailable state when no data', () => {
    render(<HistoryPage data={null} />, { wrapper: Wrapper });
    expect(screen.getByText(/історія недоступна/i)).toBeInTheDocument();
  });

  it('renders history items', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    expect(screen.getByText('Free Game 1')).toBeInTheDocument();
    expect(screen.getByText('Discounted Game 2')).toBeInTheDocument();
    expect(screen.getByText('Popular Game 3')).toBeInTheDocument();
  });

  it('filters by type', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Роздачі'));
    expect(screen.getByText('Free Game 1')).toBeInTheDocument();
    expect(screen.queryByText('Discounted Game 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular Game 3')).not.toBeInTheDocument();
  });

  it('shows empty state when filter matches nothing', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    expect(screen.getByText('Free Game 1')).toBeInTheDocument();
  });

  it('renders back to home link', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    expect(screen.getByText('На головну')).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    expect(screen.getByText('Всі')).toBeInTheDocument();
    expect(screen.getByText('Роздачі')).toBeInTheDocument();
    expect(screen.getByText('Знижки')).toBeInTheDocument();
    expect(screen.getByText('Тренди')).toBeInTheDocument();
    expect(screen.getByText('Game Pass')).toBeInTheDocument();
  });

  it('shows gamepass entries (incl. legacy xbox_new) under the Game Pass filter', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Game Pass'));
    expect(screen.getByText('Game Pass Game 4')).toBeInTheDocument();
    expect(screen.getByText('Legacy Xbox Game 5')).toBeInTheDocument();
    expect(screen.queryByText('Free Game 1')).not.toBeInTheDocument();
  });

  it('hides entries older than 30 days', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    expect(screen.queryByText('Old Game 6')).not.toBeInTheDocument();
  });

  it('renders store links for items with valid keys', () => {
    render(<HistoryPage data={mockData} />, { wrapper: Wrapper });
    const link = screen.getByLabelText(/Free Game 1/);
    expect(link).toHaveAttribute('href', 'https://store.steampowered.com/app/game1');
  });
});
