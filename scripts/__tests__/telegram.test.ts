import { describe, expect, it } from 'vitest';
import { buildTelegramBatches } from '../telegram';

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
});
