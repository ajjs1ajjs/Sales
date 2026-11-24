import { describe, expect, it } from 'vitest';
import {
  parsePsBlogRss,
  parsePsDiscountPercent,
  parsePsPrice,
  parsePsStoreProduct,
  pickPsImage,
} from '../playstation';

describe('PlayStation Store helpers', () => {
  it('parses Ukrainian UAH prices and free labels', () => {
    expect(parsePsPrice('UAH\u00a02 599,00')).toBe(2599);
    expect(parsePsPrice('UAH\u00a01 559,40')).toBe(1559.4);
    expect(parsePsPrice('UAH 499.50')).toBe(499.5);
    expect(parsePsPrice('Безкоштовно')).toBe(0);
    expect(parsePsPrice('Free')).toBe(0);
    expect(parsePsPrice('')).toBeUndefined();
  });

  it('parses discount percentages', () => {
    expect(parsePsDiscountPercent('-40%')).toBe(40);
    expect(parsePsDiscountPercent('75%')).toBe(75);
    expect(parsePsDiscountPercent(null)).toBe(0);
  });

  it('prefers 16:9 banner images over other media roles', () => {
    const img = pickPsImage([
      { type: 'VIDEO', role: 'PREVIEW', url: 'https://cdn.example/video.mp4' },
      { type: 'IMAGE', role: 'MASTER', url: 'https://cdn.example/master.png' },
      { type: 'IMAGE', role: 'SIXTEEN_BY_NINE_BANNER', url: 'https://cdn.example/16x9.jpg' },
    ]);
    expect(img).toBe('https://cdn.example/16x9.jpg');
  });

  it('parses PS5 store products and filters non-PS5 or below-threshold non-popular entries', () => {
    const deal = parsePsStoreProduct(
      {
        id: 'EP0006-PPSA23566_00-BASEUFC6GAME0000',
        name: 'UFC™ 6',
        platforms: ['PS5'],
        media: [{ type: 'IMAGE', role: 'SIXTEEN_BY_NINE_BANNER', url: 'https://cdn.example/ufc6.jpg' }],
        price: {
          basePrice: 'UAH\u00a02 599,00',
          discountedPrice: 'UAH\u00a01 559,40',
          discountText: '-40%',
          isExclusive: true,
        },
      },
      { isPopular: true, popularRank: 1, minDiscountPercent: 25 },
    );
    expect(deal).toMatchObject({
      id: 'EP0006-PPSA23566_00-BASEUFC6GAME0000',
      title: 'UFC™ 6',
      originalPrice: 2599,
      discountPrice: 1559.4,
      discountPercent: 40,
      currency: 'UAH',
      isDeal: true,
      isPopular: true,
      isPsPlusExclusive: true,
      popularRank: 1,
    });

    const ps4Only = parsePsStoreProduct(
      {
        id: 'EP0001-CUSA00001_00-OLDGAME',
        name: 'Old PS4 Game',
        platforms: ['PS4'],
        price: { basePrice: 'UAH 500,00', discountedPrice: 'UAH 100,00', discountText: '-80%' },
      },
      { isPopular: false, minDiscountPercent: 25 },
    );
    expect(ps4Only).toBeNull();
  });

  it('parses PS Plus Monthly Games (Essential) and Game Catalog (Extra) from RSS while excluding Premium Classics and PS4-only items', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <item>
      <title>PlayStation Plus Game Catalog for November: Death Stranding 2, Old PS4 Game and more</title>
      <pubDate>Tue, 10 Nov 2026 16:30:03 +0000</pubDate>
      <content:encoded><![CDATA[
        <h2><strong>PlayStation Plus Extra and Premium | Game Catalog&nbsp;</strong></h2>
        <div class="ps-image-modal__wrapper "><figure><img src="https://blog.playstation.com/tachyon/2026/11/ds2.jpg?fit=1024%2C1024"></figure><button>Close</button><p>Download this image</p></div>
        <p><strong>Death Stranding 2: On the Beach | PS5</strong></p>
        <p>Embark on an inspiring mission of human connection across a fractured world.</p>
        <p><strong>Legacy PS4 Only | PS4</strong></p>
        <p>Only available on PS4.</p>
        <h2><strong>PlayStation Plus Premium</strong></h2>
        <p><strong>Soul Reaver 2 | PS5, PS4</strong></p>
        <p>Classic catalog title.</p>
      ]]></content:encoded>
    </item>
    <item>
      <title>PlayStation Plus Monthly Games for November: Dead Island 2, Monster Train 2</title>
      <pubDate>Wed, 28 Oct 2026 15:31:43 +0000</pubDate>
      <content:encoded><![CDATA[
        <img src="https://blog.playstation.com/tachyon/2026/10/di2.jpeg">
        <h3>Dead Island 2 | PS5, PS4&nbsp;</h3>
        <p>Slice and smash your way through zombie-infested Los Angeles.</p>
        <img src="https://blog.playstation.com/tachyon/2026/10/mt2.jpeg">
        <h3>Monster Train 2 | PS5&nbsp;</h3>
        <p>Deckbuilding journey through Heaven, Hell and beyond.</p>
      ]]></content:encoded>
    </item>
  </channel>
</rss>`;

    const games = parsePsBlogRss(rss);
    expect(games).toHaveLength(3);
    expect(games.map((g) => ({ id: g.id, tier: g.psPlusTier, month: g.psPlusMonth }))).toEqual([
      { id: 'ps_extra_death-stranding-2-on-the-beach', tier: 'extra', month: 'November 2026' },
      { id: 'ps_essential_dead-island-2', tier: 'essential', month: 'November 2026' },
      { id: 'ps_essential_monster-train-2', tier: 'essential', month: 'November 2026' },
    ]);
    expect(games[0].imageUrl).toBe('https://blog.playstation.com/tachyon/2026/11/ds2.jpg');
    expect(games[0].description).toContain('inspiring mission');
    expect(games.some((g) => g.title.includes('Soul Reaver 2'))).toBe(false);
    expect(games.some((g) => g.title.includes('Legacy PS4 Only'))).toBe(false);
  });
});
