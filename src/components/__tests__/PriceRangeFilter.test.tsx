import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { PriceRangeFilter } from '../PriceRangeFilter';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider initialLocale="uk">{children}</LocaleProvider>;
}

describe('PriceRangeFilter', () => {
  const defaultProps = {
    minPrice: 0,
    maxPrice: 1000,
    range: [0, 1000] as [number, number],
    onChange: vi.fn(),
    currency: 'UAH',
  };

  it('renders toggle button', () => {
    render(<PriceRangeFilter {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Фільтр за ціною')).toBeInTheDocument();
  });

  it('shows inputs when toggled open', () => {
    render(<PriceRangeFilter {...defaultProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Фільтр за ціною'));
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
  });

  it('calls onChange when min value changes', () => {
    const onChange = vi.fn();
    render(<PriceRangeFilter {...defaultProps} onChange={onChange} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Фільтр за ціною'));
    const minInput = screen.getByDisplayValue('0');
    fireEvent.change(minInput, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith([50, 1000]);
  });

  it('calls onChange when max value changes', () => {
    const onChange = vi.fn();
    render(<PriceRangeFilter {...defaultProps} onChange={onChange} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Фільтр за ціною'));
    const maxInput = screen.getByDisplayValue('1000');
    fireEvent.change(maxInput, { target: { value: '500' } });
    expect(onChange).toHaveBeenCalledWith([0, 500]);
  });

  it('resets values on reset click', () => {
    const onChange = vi.fn();
    render(<PriceRangeFilter {...defaultProps} range={[100, 500]} onChange={onChange} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Фільтр за ціною'));
    fireEvent.click(screen.getByText('Скинути'));
    expect(onChange).toHaveBeenCalledWith([0, 1000]);
  });

  it('hides content when toggled closed', () => {
    render(<PriceRangeFilter {...defaultProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Фільтр за ціною'));
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Приховати фільтр ціни'));
    expect(screen.queryByDisplayValue('0')).not.toBeInTheDocument();
  });
});
