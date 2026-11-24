import { describe, expect, it } from 'vitest';
import { buildDigestBatches, buildTelegramBatches, isQuietHoursKyiv } from '../telegram';

describe('Telegram batching', () => {
  it('keeps every complete HTML item under both configured limits', () => {
    const items = Array.from({ length: 7 }, (_, index) => `offer-${index}`);
    const batches = buildTelegramBatches(items, '<b>Offers</b>\n', '\nFooter', (item) => `<b>${item}</b>`, 55, 3);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flatMap((batch) => batch.items)).toEqual(items);
    for (const batch of batches) {
      expect(batch.text.length).toBeLessThanOrEqual(55);
      expect(batch.items.length).toBeLessThanOrEqual(3);
      expect(batch.text.startsWith('<b>Offers</b>\n')).toBe(true);
      expect(batch.text.endsWith('\nFooter')).toBe(true);
    }
  });

  it('rejects a single item that cannot fit without truncation', () => {
    expect(() => buildTelegramBatches(['long'], '', '', () => 'x'.repeat(10), 9)).toThrow(/exceeds/);
  });

  it('emits single-item photo cards for valid URLs, batches items without valid photos, and caps captions at 1000 chars', () => {
    const items = [
      { id: 'no-img', imageUrl: '' },
      { id: 'proto-rel', imageUrl: '//cdn.example.com/a.jpg' },
      { id: 'good-1', imageUrl: 'https://cdn.example.com/1.jpg' },
      { id: 'good-2', imageUrl: 'http://cdn.example.com/2.jpg' },
      { id: 'bad-proto', imageUrl: 'ftp://cdn.example.com/3.jpg' },
    ];
    const batches = buildTelegramBatches(
      items,
      'H\n',
      'F',
      (item) => item.id,
      3800,
      10,
      (item) => item.imageUrl,
    );
    expect(batches).toHaveLength(4);
    expect(batches[0]).toEqual({ items: [items[0], items[1]], text: 'H\nno-img\n\nproto-rel\n\nF' });
    expect('photoUrl' in batches[0]).toBe(false);
    expect(batches[1]).toEqual({ items: [items[2]], text: 'H\ngood-1\n\nF', photoUrl: 'https://cdn.example.com/1.jpg' });
    expect(batches[2]).toEqual({ items: [items[3]], text: 'H\ngood-2\n\nF', photoUrl: 'http://cdn.example.com/2.jpg' });
    expect(batches[3]).toEqual({ items: [items[4]], text: 'H\nbad-proto\n\nF' });
    expect(() =>
      buildTelegramBatches(
        [{ id: 'x', imageUrl: 'https://cdn.example.com/x.jpg' }],
        '',
        '',
        () => 'a'.repeat(999),
        3800,
        10,
        (item) => item.imageUrl,
      ),
    ).toThrow(/exceeds/);
  });

  it('builds compact digests with hero photo when <= 1000 chars and drops hero photo on long captions', () => {
    const shortItems = ['Game A', 'Game B'];
    const shortDigests = buildDigestBatches(shortItems, {
      header: '<b>TOP</b>\n',
      footer: '#steam',
      renderItem: (x) => `• ${x}`,
      heroPhotoUrl: 'https://cdn.example.com/hero.jpg',
      replyMarkup: { inline_keyboard: [[{ text: 'Site', url: 'https://example.com' }]] },
    });
    expect(shortDigests).toHaveLength(1);
    expect(shortDigests[0].photoUrl).toBe('https://cdn.example.com/hero.jpg');
    expect(shortDigests[0].replyMarkup?.inline_keyboard[0][0].text).toBe('Site');

    const longItems = Array.from({ length: 5 }, (_, i) => `Game ${i} ${'x'.repeat(220)}`);
    const longDigests = buildDigestBatches(longItems, {
      header: '<b>TOP</b>\n',
      footer: '#steam',
      renderItem: (x) => `• ${x}`,
      heroPhotoUrl: 'https://cdn.example.com/hero.jpg',
    });
    expect(longDigests[0].photoUrl).toBeUndefined();
  });

  it('detects Kyiv quiet hours between 23:00 and 08:00', () => {
    // 02:00 UTC in November is 04:00 Europe/Kyiv (quiet)
    expect(isQuietHoursKyiv(new Date('2026-11-24T02:00:00Z'))).toBe(true);
    // 12:00 UTC in November is 14:00 Europe/Kyiv (daytime)
    expect(isQuietHoursKyiv(new Date('2026-11-24T12:00:00Z'))).toBe(false);
  });
});
