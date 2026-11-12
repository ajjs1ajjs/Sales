import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { WishlistProvider } from '../../contexts/WishlistContext';
import { WishlistSection } from '../WishlistSection';

const saved = { '123': { platform: 'steam', game: { id: '123', title: 'Saved game', imageUrl: 'https://example.com/image.png', url: 'https://store.steampowered.com/app/123' } } };

function show() {
  return render(<LocaleProvider initialLocale="uk"><WishlistProvider><WishlistSection steam={[]} gamepass={[]} missingIds={['123']} searchQuery="" sortType="default" /></WishlistProvider></LocaleProvider>);
}

describe('wishlist persistence', () => {
  beforeEach(() => window.localStorage.clear());
  it('shows saved games outside the current catalog without stale prices', () => {
    window.localStorage.setItem('wishlist', JSON.stringify(['123']));
    window.localStorage.setItem('wishlist-snapshots', JSON.stringify(saved));
    show();
    expect(screen.getByText('Saved game')).toBeInTheDocument();
    expect(screen.getByText(/Ціна невідома/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Відкрити в магазині' })).toHaveAttribute('href', saved['123'].game.url);
    fireEvent.click(screen.getByRole('button', { name: 'Видалити Saved game з обраного' }));
    expect(JSON.parse(window.localStorage.getItem('wishlist')!)).toEqual([]);
  });
  it('merges an imported wishlist and rejects invalid data', async () => {
    window.localStorage.setItem('wishlist', JSON.stringify(['old']));
    const { container } = show();
    const input = container.querySelector('input[type=file]')!;
    const file = new File([''], 'wishlist.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(JSON.stringify({ version: 1, ids: ['123'], saved, targets: { '123': { amount: 199, currency: 'UAH' } } })) });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('об’єднано'));
    expect(JSON.parse(window.localStorage.getItem('wishlist')!)).toEqual(['old', '123']);
    expect(JSON.parse(window.localStorage.getItem('wishlist-price-targets')!)).toEqual({ '123': { amount: 199, currency: 'UAH' } });
    const bad = new File([''], 'bad.json');
    Object.defineProperty(bad, 'text', { value: () => Promise.resolve('{') });
    fireEvent.change(input, { target: { files: [bad] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Не вдалося'));
    expect(JSON.parse(window.localStorage.getItem('wishlist')!)).toEqual(['old', '123']);
  });
});

