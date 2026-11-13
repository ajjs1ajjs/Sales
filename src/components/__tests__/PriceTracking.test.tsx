import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { WishlistProvider } from '../../contexts/WishlistContext';
import { PriceTracking } from '../PriceTracking';

function show(currentPrice?: number) {
  return render(<LocaleProvider initialLocale="uk"><WishlistProvider>
    <PriceTracking id="123" title="Game" currency="UAH" currentPrice={currentPrice} observations={[
      { date: '2026-11-10', price: 300, currency: 'UAH' },
      { date: '2026-11-11', price: 250, currency: 'UAH' },
      { date: '2026-11-11', price: 1, currency: 'USD' },
    ]} />
  </WishlistProvider></LocaleProvider>);
}

describe('price tracking', () => {
  beforeEach(() => window.localStorage.clear());
  it('saves and removes a target, comparing it to the current price', () => {
    show(200);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '250,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));
    expect(screen.getByRole('status')).toHaveTextContent('Бажаної ціни досягнуто');
    expect(JSON.parse(window.localStorage.getItem('wishlist-price-targets')!)).toEqual({ '123': { amount: 250.5, currency: 'UAH' } });
    fireEvent.click(screen.getByRole('button', { name: 'Прибрати' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('does not claim that an unavailable game has reached the target', () => {
    window.localStorage.setItem('wishlist-price-targets', JSON.stringify({ '123': { amount: 250, currency: 'UAH' } }));
    show();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('reports only observations in the selected currency', () => {
    show(200);
    fireEvent.click(screen.getByText('Історія цін'));
    expect(screen.getByText(/Найнижча зафіксована ціна:/)).toHaveTextContent('250');
    expect(screen.getByRole('img', { name: /Графік зафіксованих цін/ })).toBeInTheDocument();
    expect(screen.queryByText(/2026-11-11:.*1,00/)).not.toBeInTheDocument();
  });
});
