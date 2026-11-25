import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { SearchControls } from '../SearchControls';
import type { FilterType } from '../../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider initialLocale="uk">{children}</LocaleProvider>;
}

describe('SearchControls', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    activeFilter: 'all' as FilterType,
    onFilterChange: vi.fn(),
    sortType: 'default' as const,
    onSortChange: vi.fn(),
  };

  it('renders search input', () => {
    render(<SearchControls {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText('Пошук гри за назвою...')).toBeInTheDocument();
  });

  it('renders platform tabs and contextual sub-filters', () => {
    render(<SearchControls {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Всі платформи')).toBeInTheDocument();
    expect(screen.getByText('Steam')).toBeInTheDocument();
    expect(screen.getByText('PC Game Pass')).toBeInTheDocument();
    expect(screen.getByText('PlayStation 5')).toBeInTheDocument();
    expect(screen.getByText('Обране')).toBeInTheDocument();
    expect(screen.getByText('Steam Знижки')).toBeInTheDocument();
    expect(screen.getByText('Steam DLC')).toBeInTheDocument();
    expect(screen.getByText('Game Pass Нові')).toBeInTheDocument();
    expect(screen.getByText('Game Pass Знижки')).toBeInTheDocument();
    expect(screen.getByText('PS5 Знижки')).toBeInTheDocument();
    expect(screen.getByText('PS+ Ігри місяця')).toBeInTheDocument();
    expect(screen.getByText('PS+ Extra')).toBeInTheDocument();
  });

  it('shows platform-specific sub-filters when Steam, Game Pass, or PlayStation tab is active', () => {
    const onFilterChange = vi.fn();
    const { rerender } = render(
      <SearchControls {...defaultProps} activeFilter="gamepass_all" onFilterChange={onFilterChange} />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByText('Game Pass Нові'));
    expect(onFilterChange).toHaveBeenCalledWith('gamepass_new');
    fireEvent.click(screen.getByText('Game Pass Топ'));
    expect(onFilterChange).toHaveBeenCalledWith('gamepass_popular');

    rerender(<SearchControls {...defaultProps} activeFilter="ps_all" onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText('PS+ Ігри місяця'));
    expect(onFilterChange).toHaveBeenCalledWith('ps_essential');
    fireEvent.click(screen.getByText('PS5 Топ'));
    expect(onFilterChange).toHaveBeenCalledWith('ps_popular');
  });

  it('calls onSearchChange on input', () => {
    const onSearchChange = vi.fn();
    render(<SearchControls {...defaultProps} onSearchChange={onSearchChange} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText('Пошук гри за назвою...'), {
      target: { value: 'Cyberpunk' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('Cyberpunk');
  });

  it('calls onFilterChange on platform tab click', () => {
    const onFilterChange = vi.fn();
    render(<SearchControls {...defaultProps} onFilterChange={onFilterChange} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Steam'));
    expect(onFilterChange).toHaveBeenCalledWith('steam_all');
    fireEvent.click(screen.getByText('PlayStation 5'));
    expect(onFilterChange).toHaveBeenCalledWith('ps_all');
  });

  it('marks active platform tab and sub-filter button as pressed', () => {
    const { rerender } = render(<SearchControls {...defaultProps} activeFilter="steam_free" />, { wrapper: Wrapper });
    expect(screen.getByText('Steam').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Steam Безкоштовно')).toHaveAttribute('aria-pressed', 'true');

    rerender(<SearchControls {...defaultProps} activeFilter="steam_dlc" />);
    expect(screen.getByText('Steam DLC')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders filter counts when provided', () => {
    const filterCounts: Record<FilterType, number> = {
      all: 25,
      steam_all: 15,
      steam_free: 1,
      steam_specials: 6,
      steam_popular: 8,
      steam_dlc: 2,
      gamepass_all: 5,
      gamepass_new: 3,
      gamepass_popular: 2,
      gamepass_deals: 4,
      ps_all: 5,
      ps_essential: 2,
      ps_extra: 1,
      ps_deals: 2,
      ps_popular: 2,
      wishlist: 1,
    };
    render(<SearchControls {...defaultProps} filterCounts={filterCounts} />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /Всі платформи\s*\(25\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Steam\s*\(15\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PC Game Pass\s*\(5\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PlayStation 5\s*\(5\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Steam Знижки\s*\(6\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Обране\s*\(1\)/i })).toBeInTheDocument();
  });
});
