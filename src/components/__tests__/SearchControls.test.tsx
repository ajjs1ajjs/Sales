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

  it('renders all filter buttons', () => {
    render(<SearchControls {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Всі категорії')).toBeInTheDocument();
    expect(screen.getByText('Steam Безкоштовно')).toBeInTheDocument();
    expect(screen.getByText('Steam Знижки')).toBeInTheDocument();
    expect(screen.getByText('Steam Тренди')).toBeInTheDocument();
    expect(screen.getByText('Обране')).toBeInTheDocument();
  });

  it('calls onSearchChange on input', () => {
    const onSearchChange = vi.fn();
    render(<SearchControls {...defaultProps} onSearchChange={onSearchChange} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText('Пошук гри за назвою...'), {
      target: { value: 'Cyberpunk' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('Cyberpunk');
  });

  it('calls onFilterChange on button click', () => {
    const onFilterChange = vi.fn();
    render(<SearchControls {...defaultProps} onFilterChange={onFilterChange} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Steam Безкоштовно'));
    expect(onFilterChange).toHaveBeenCalledWith('steam_free');
  });

  it('marks active filter button as pressed', () => {
    const { rerender } = render(<SearchControls {...defaultProps} activeFilter="steam_free" />, { wrapper: Wrapper });
    expect(screen.getByText('Steam Безкоштовно')).toHaveAttribute('aria-pressed', 'true');

    rerender(<SearchControls {...defaultProps} activeFilter="steam_specials" />);
    expect(screen.getByText('Steam Знижки')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders filter counts when provided', () => {
    const filterCounts = {
      all: 15,
      steam_free: 1,
      steam_specials: 6,
      steam_popular: 8,
      wishlist: 1,
    };
    render(<SearchControls {...defaultProps} filterCounts={filterCounts} />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /Всі категорії\(15\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Steam Знижки\(6\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Steam Безкоштовно\(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Steam Тренди\(8\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Обране\(1\)/i })).toBeInTheDocument();
  });
});
