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

const mockData: DealsData = {
  lastUpdated: '2026-06-16T03:44:30.960Z',
  epic: [],
  steam: [],
  notifiedHistory: {
    'epic_free_game1': {
      title: 'Free Game 1',
      price: 0,
      percent: 100,
      timestamp: '2026-06-15T10:00:00.000Z',
      type: 'free',
    },
    'steam_discount_game2': {
      title: 'Discounted Game 2',
      price: 9.99,
      percent: 50,
      timestamp: '2026-06-14T10:00:00.000Z',
      type: 'discount',
    },
    'steam_popular_game3': {
      title: 'Popular Game 3',
      price: 29.99,
      percent: 0,
      timestamp: '2026-06-13T10:00:00.000Z',
      type: 'popular',
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
  });
});
