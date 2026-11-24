import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { WishlistProvider } from '../../contexts/WishlistContext';
import { PlayStationSection } from '../PlayStationSection';
import type { PlayStationGame } from '../../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider initialLocale="uk">
      <WishlistProvider>{children}</WishlistProvider>
    </LocaleProvider>
  );
}

const sampleGames: PlayStationGame[] = [
  {
    id: 'ps_essential_dead-island-2',
    title: 'Dead Island 2',
    imageUrl: 'https://example.com/di2.jpg',
    url: 'https://store.playstation.com/uk-ua/search/Dead%20Island%202',
    isDeal: false,
    isPopular: false,
    psPlusTier: 'essential',
    psPlusMonth: 'November 2026',
  },
  {
    id: 'ps_extra_ds2',
    title: 'Death Stranding 2',
    imageUrl: 'https://example.com/ds2.jpg',
    url: 'https://store.playstation.com/uk-ua/search/Death%20Stranding%202',
    isDeal: false,
    isPopular: false,
    psPlusTier: 'extra',
    psPlusMonth: 'November 2026',
  },
  {
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
  },
  {
    id: 'EP0001-PPSA00001_00-TOPONLY',
    title: 'Popular Hit PS5',
    imageUrl: 'https://example.com/top.jpg',
    url: 'https://store.playstation.com/uk-ua/product/EP0001-PPSA00001_00-TOPONLY',
    originalPrice: 1999,
    discountPrice: 1999,
    currency: 'UAH',
    isDeal: false,
    isPopular: true,
  },
];

describe('PlayStationSection', () => {
  it('renders Essential, Extra, Deals, and Popular subsections on ps_all', () => {
    render(
      <PlayStationSection
        games={sampleGames}
        activeFilter="ps_all"
        searchQuery=""
        sortType="default"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('PS Plus Essential — Ігри місяця')).toBeInTheDocument();
    expect(screen.getByText('Каталог PS Plus Extra — Новинки')).toBeInTheDocument();
    expect(screen.getByText('Топ знижки PlayStation 5')).toBeInTheDocument();
    expect(screen.getByText('Топ продажів PlayStation 5')).toBeInTheDocument();
    expect(screen.getByText('Dead Island 2')).toBeInTheDocument();
    expect(screen.getByText('Death Stranding 2')).toBeInTheDocument();
    expect(screen.getByText('UFC 6')).toBeInTheDocument();
    expect(screen.getByText('Додатково з PS+')).toBeInTheDocument();
    expect(screen.getByText('Popular Hit PS5')).toBeInTheDocument();
  });

  it('filters to only Essential when activeFilter is ps_essential', () => {
    render(
      <PlayStationSection
        games={sampleGames}
        activeFilter="ps_essential"
        searchQuery=""
        sortType="default"
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Dead Island 2')).toBeInTheDocument();
    expect(screen.queryByText('Death Stranding 2')).not.toBeInTheDocument();
    expect(screen.queryByText('UFC 6')).not.toBeInTheDocument();
  });
});
